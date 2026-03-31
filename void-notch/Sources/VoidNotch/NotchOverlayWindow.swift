import AppKit
import SwiftUI

// MARK: - NSScreen helper

extension NSScreen {
    /// Returns the built-in display (the one with the notch), or main screen as fallback.
    static var builtIn: NSScreen? {
        screens.first { screen in
            let id = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID ?? 0
            return CGDisplayIsBuiltin(id) != 0
        } ?? main
    }
}

// MARK: - Notch Window

/// Window that sits exactly over the notch area. The window frame IS the pill —
/// it starts at notch size and expands/contracts as status changes.
/// Replicates Notchy's NotchWindow behavior.
class NotchOverlayWindow: NSPanel {
    var onHover: (() -> Void)?
    var onClick: (() -> Void)?

    private var mouseMonitor: Any?
    private var localMouseMonitor: Any?
    private var screenObserver: Any?

    /// Detected notch dimensions
    private(set) var notchWidth: CGFloat = 180
    private(set) var notchHeight: CGFloat = 37

    /// Whether the notch pill is currently expanded (wider, for active status)
    private(set) var isExpanded = false
    private var isHovered = false

    /// Debounce timer for collapse
    private var collapseDebounceTimer: Timer?

    /// Whether there's any active session (connected)
    private var hasActiveSession = false

    /// The pill-shaped background view (fills entire window)
    let pillView: NotchPillView

    /// SwiftUI content overlay inside the pill
    private var pillContentHost: NSHostingView<NotchPillContent>?

    // Current state
    var currentConnection: String = "disconnected"
    var currentAI: String = "idle"
    var activeHost: String?

    init() {
        pillView = NotchPillView()

        super.init(
            contentRect: .zero,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: true
        )

        isFloatingPanel = true
        level = .statusBar
        backgroundColor = .clear
        hasShadow = false
        isOpaque = false
        animationBehavior = .none
        hidesOnDeactivate = false
        isMovableByWindowBackground = false
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        ignoresMouseEvents = false
        alphaValue = 1

        // Pill view fills entire window
        if let cv = contentView {
            pillView.frame = cv.bounds
            pillView.autoresizingMask = [.width, .height]
            pillView.alphaValue = 1
            cv.addSubview(pillView)
            cv.wantsLayer = true
            cv.layer?.masksToBounds = false

            // SwiftUI content overlay
            let hostView = NSHostingView(rootView: NotchPillContent())
            hostView.frame = cv.bounds
            hostView.autoresizingMask = [.width, .height]
            hostView.alphaValue = 1
            hostView.wantsLayer = true
            hostView.layer?.backgroundColor = .clear
            cv.addSubview(hostView)
            pillContentHost = hostView
        }

        detectNotchSize()
        positionAtNotch()
        orderFrontRegardless()
        setupTracking()
        observeScreenChanges()
    }

    deinit {
        if let monitor = mouseMonitor { NSEvent.removeMonitor(monitor) }
        if let monitor = localMouseMonitor { NSEvent.removeMonitor(monitor) }
        if let observer = screenObserver { NotificationCenter.default.removeObserver(observer) }
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    // MARK: - Status Update

    func updateStatus(connection: String, ai: String, host: String?) {
        let changed = connection != currentConnection || ai != currentAI
        currentConnection = connection
        currentAI = ai
        activeHost = host
        hasActiveSession = (connection == "connected" || connection == "reconnecting")

        if changed {
            // Update SwiftUI content
            pillContentHost?.rootView = NotchPillContent(
                connection: connection, ai: ai, host: host, isHovering: isHovered
            )
            updateExpansionState()
        }
    }

    // MARK: - Expand / Collapse

    private var shouldExpand: Bool {
        hasActiveSession || currentAI == "working" || currentAI == "waiting" || currentConnection == "reconnecting"
    }

    private func updateExpansionState() {
        if shouldExpand && !isExpanded {
            collapseDebounceTimer?.invalidate()
            collapseDebounceTimer = nil
            expandWithBounce()
        } else if !shouldExpand && isExpanded {
            guard collapseDebounceTimer == nil else { return }
            collapseDebounceTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { [weak self] _ in
                guard let self else { return }
                self.collapseDebounceTimer = nil
                if !self.shouldExpand && self.isExpanded {
                    self.collapse()
                }
            }
        } else if shouldExpand && isExpanded {
            collapseDebounceTimer?.invalidate()
            collapseDebounceTimer = nil
        }
    }

    private func expandWithBounce() {
        isExpanded = true
        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame

        let targetWidth: CGFloat = notchWidth + 200 // 100px visible wing on each side
        var targetFrame = NSRect(
            x: screenFrame.midX - targetWidth / 2,
            y: screenFrame.maxY - notchHeight,
            width: targetWidth,
            height: notchHeight
        )
        if isHovered { targetFrame = applyHoverGrow(to: targetFrame) }

        pillView.alphaValue = 1
        pillContentHost?.alphaValue = 1

        let startFrame = frame
        let startTime = CACurrentMediaTime()
        let duration: Double = 0.6

        let displayLink = CVDisplayLinkWrapper { [weak self] in
            guard let self else { return false }
            let elapsed = CACurrentMediaTime() - startTime
            let t = min(elapsed / duration, 1.0)
            let bounce = Self.bounceEase(t)

            let currentX = startFrame.origin.x + (targetFrame.origin.x - startFrame.origin.x) * bounce
            let currentWidth = startFrame.width + (targetFrame.width - startFrame.width) * bounce

            DispatchQueue.main.async {
                self.setFrame(
                    NSRect(x: currentX, y: targetFrame.origin.y, width: currentWidth, height: targetFrame.height),
                    display: true
                )
            }
            return t < 1.0
        }
        displayLink.start()
    }

    private func collapse() {
        isExpanded = false

        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.15
            self.pillContentHost?.animator().alphaValue = 0
        }

        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame

        var targetFrame = NSRect(
            x: screenFrame.midX - notchWidth / 2,
            y: screenFrame.maxY - notchHeight,
            width: notchWidth,
            height: notchHeight
        )
        if isHovered { targetFrame = applyHoverGrow(to: targetFrame) }

        let startFrame = frame
        let startTime = CACurrentMediaTime()
        let duration: Double = 0.3

        let displayLink = CVDisplayLinkWrapper { [weak self] in
            guard let self else { return false }
            let elapsed = CACurrentMediaTime() - startTime
            let t = min(elapsed / duration, 1.0)
            let ease = 1.0 - pow(1.0 - t, 3.0)

            let currentX = startFrame.origin.x + (targetFrame.origin.x - startFrame.origin.x) * ease
            let currentWidth = startFrame.width + (targetFrame.width - startFrame.width) * ease

            DispatchQueue.main.async {
                self.setFrame(
                    NSRect(x: currentX, y: targetFrame.origin.y, width: currentWidth, height: targetFrame.height),
                    display: true
                )
                if t >= 1.0 {
                    self.pillContentHost?.alphaValue = 1
                }
            }
            return t < 1.0
        }
        displayLink.start()
    }

    /// Spring / bounce easing (ω=12, ζ=0.4)
    private static func bounceEase(_ t: Double) -> Double {
        let omega = 12.0
        let zeta = 0.4
        return 1.0 - exp(-zeta * omega * t) * cos(sqrt(1.0 - zeta * zeta) * omega * t)
    }

    // MARK: - Notch size detection

    func detectNotchSize() {
        guard let screen = NSScreen.builtIn else { return }

        if #available(macOS 12.0, *),
           let left = screen.auxiliaryTopLeftArea,
           let right = screen.auxiliaryTopRightArea {
            notchWidth = right.minX - left.maxX
            notchHeight = screen.frame.maxY - min(left.minY, right.minY)
        } else {
            let menuBarHeight = screen.frame.maxY - screen.visibleFrame.maxY
            notchWidth = 180
            notchHeight = max(menuBarHeight, 25)
        }
    }

    // MARK: - Positioning

    func positionAtNotch() {
        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame
        let x = screenFrame.midX - notchWidth / 2
        let y = screenFrame.maxY - notchHeight
        setFrame(NSRect(x: x, y: y, width: notchWidth, height: notchHeight), display: true)
    }

    // MARK: - Mouse tracking

    private func setupTracking() {
        mouseMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged]) { [weak self] _ in
            self?.checkMouse()
        }
        localMouseMonitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged, .leftMouseDown]) { [weak self] event in
            if event.type == .leftMouseDown {
                self?.handleClick()
            } else {
                self?.checkMouse()
            }
            return event
        }
    }

    private func checkMouse() {
        let mouseLocation = NSEvent.mouseLocation

        // Method 1: Check against our actual window frame (most reliable)
        let windowRect = frame.insetBy(dx: -15, dy: -15)

        // Method 2: Check against the notch area on screen
        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame
        let effectiveWidth = isExpanded ? notchWidth + 200 : notchWidth
        // Extend downward by 20px so hover triggers below the menu bar too
        let notchRect = NSRect(
            x: screenFrame.midX - effectiveWidth / 2 - 10,
            y: screenFrame.maxY - notchHeight - 20,
            width: effectiveWidth + 20,
            height: notchHeight + 25
        )

        if windowRect.contains(mouseLocation) || notchRect.contains(mouseLocation) {
            if !isHovered {
                isHovered = true
                hoverGrow()
            }
            // Don't fire onHover repeatedly — AppDelegate handles debounce
        } else if isHovered {
            isHovered = false
            hoverShrink()
        }
    }

    private func handleClick() {
        let mouseLocation = NSEvent.mouseLocation
        let expandedFrame = frame.insetBy(dx: -5, dy: -5)
        if expandedFrame.contains(mouseLocation) {
            onClick?()
        }
    }

    /// Called externally when the panel hides
    func endHover() {
        guard isHovered else { return }
        isHovered = false
        hoverShrink()
    }

    // MARK: - Hover grow / shrink

    private static let hoverGrowX: CGFloat = NotchPillView.earRadius * 2
    private static let hoverGrowY: CGFloat = 2

    private func applyHoverGrow(to rect: NSRect) -> NSRect {
        NSRect(
            x: rect.origin.x - Self.hoverGrowX / 2,
            y: rect.origin.y - Self.hoverGrowY,
            width: rect.width + Self.hoverGrowX,
            height: rect.height + Self.hoverGrowY
        )
    }

    private func hoverGrow() {
        pillView.isHovered = true
        pillContentHost?.rootView = NotchPillContent(
            connection: currentConnection, ai: currentAI, host: activeHost, isHovering: true
        )
        print("[VoidNotch] Hover IN — expanding pill")

        // Always expand to show content on hover (even when idle/disconnected)
        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame
        let hoverWidth: CGFloat = notchWidth + 200
        var targetFrame = NSRect(
            x: screenFrame.midX - hoverWidth / 2,
            y: screenFrame.maxY - notchHeight,
            width: hoverWidth,
            height: notchHeight
        )
        targetFrame = applyHoverGrow(to: targetFrame)
        setFrame(targetFrame, display: true)
        pillContentHost?.alphaValue = 1
        onHover?()
    }

    private func hoverShrink() {
        pillView.isHovered = false
        pillContentHost?.rootView = NotchPillContent(
            connection: currentConnection, ai: currentAI, host: activeHost, isHovering: false
        )
        guard let screen = NSScreen.builtIn else { return }
        let screenFrame = screen.frame
        let baseWidth = isExpanded ? notchWidth + 200 : notchWidth
        let targetFrame = NSRect(
            x: screenFrame.midX - baseWidth / 2,
            y: screenFrame.maxY - notchHeight,
            width: baseWidth,
            height: notchHeight
        )
        setFrame(targetFrame, display: true)
        if !isExpanded {
            pillContentHost?.alphaValue = 0
        }
    }

    // MARK: - Observers

    private func observeScreenChanges() {
        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.detectNotchSize()
            self?.positionAtNotch()
        }
    }
}

// MARK: - Notch Pill View (fills entire window)

/// Draws a black pill shape. Flat top, rounded bottom corners (9.5px).
/// On hover, concave ear protrusions appear at bottom corners.
class NotchPillView: NSView {
    var isHovered: Bool = false {
        didSet {
            guard isHovered != oldValue else { return }
            needsDisplay = true
            needsLayout = true
        }
    }

    private let shapeLayer = CAShapeLayer()
    static let earRadius: CGFloat = 10

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.masksToBounds = false
        layer?.backgroundColor = .clear
        shapeLayer.fillColor = NSColor.black.cgColor
        layer?.addSublayer(shapeLayer)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layout() {
        super.layout()
        updateShape()
    }

    private func updateShape() {
        let w = bounds.width
        let h = bounds.height
        guard w > 0, h > 0 else { return }

        let ear = Self.earRadius
        shapeLayer.frame = CGRect(x: 0, y: 0, width: w, height: h)

        let path = CGMutablePath()

        if isHovered {
            let bodyLeft = ear
            let bodyRight = w - ear

            // Left ear tip (bottom-left)
            path.move(to: CGPoint(x: 0, y: 0))
            // Concave curve up into body
            path.addQuadCurve(to: CGPoint(x: bodyLeft, y: ear), control: CGPoint(x: bodyLeft, y: 0))
            // Left edge up
            path.addLine(to: CGPoint(x: bodyLeft, y: h))
            // Top edge
            path.addLine(to: CGPoint(x: bodyRight, y: h))
            // Right edge down
            path.addLine(to: CGPoint(x: bodyRight, y: ear))
            // Concave curve out to right ear
            path.addQuadCurve(to: CGPoint(x: w, y: 0), control: CGPoint(x: bodyRight, y: 0))
        } else {
            let cr: CGFloat = 9.5
            // Flat top, rounded bottom corners
            path.move(to: CGPoint(x: 0, y: h))
            path.addLine(to: CGPoint(x: w, y: h))
            path.addLine(to: CGPoint(x: w, y: cr))
            path.addQuadCurve(to: CGPoint(x: w - cr, y: 0), control: CGPoint(x: w, y: 0))
            path.addLine(to: CGPoint(x: cr, y: 0))
            path.addQuadCurve(to: CGPoint(x: 0, y: cr), control: CGPoint(x: 0, y: 0))
            path.closeSubpath()
        }

        shapeLayer.path = path
    }
}

// MARK: - Notch Pill SwiftUI Content

struct NotchPillContent: View {
    var connection: String = "disconnected"
    var ai: String = "idle"
    var host: String?
    var isHovering: Bool = false

    private var hasSession: Bool {
        connection == "connected" || connection == "reconnecting" || ai == "working"
    }

    var body: some View {
        // Content is split into LEFT WING and RIGHT WING
        // The physical notch covers the center, so we position content
        // in the visible areas on each side
        HStack(spacing: 0) {
            // LEFT WING — status dot + label
            if hasSession || isHovering {
                HStack(spacing: 6) {
                    Circle()
                        .fill(dotColor)
                        .frame(width: 7, height: 7)

                    Text(leftLabel)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(1)
                }
                .padding(.leading, 10 + (isHovering ? NotchPillView.earRadius : 0))
            }

            Spacer()

            // RIGHT WING — icon + status text
            if hasSession || isHovering {
                HStack(spacing: 5) {
                    Text(rightLabel)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)

                    rightIcon
                }
                .padding(.trailing, 10 + (isHovering ? NotchPillView.earRadius : 0))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: ai)
        .animation(.easeInOut(duration: 0.25), value: connection)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .offset(y: isHovering ? -3 : -2)
    }

    private var leftLabel: String {
        if ai == "waiting" { return "Attention" }
        if ai == "working" { return host ?? "Working" }
        if connection == "connected" { return host ?? "SSH" }
        if connection == "reconnecting" { return "Retry" }
        return "Void"
    }

    private var rightLabel: String {
        if ai == "waiting" { return "Input" }
        if ai == "working" { return "" }
        if connection == "reconnecting" { return "!" }
        if connection == "connected" { return "Live" }
        return "Off"
    }

    @ViewBuilder
    private var rightIcon: some View {
        if ai == "waiting" {
            Image(systemName: "exclamationmark.bubble.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.yellow)
                .transition(.scale.combined(with: .opacity))
        } else if ai == "working" {
            SpinnerView()
                .frame(width: 14, height: 14)
                .transition(.scale.combined(with: .opacity))
        } else if connection == "reconnecting" {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.yellow)
                .transition(.scale.combined(with: .opacity))
        } else if connection == "connected" {
            Image(systemName: "bolt.fill")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.green)
                .transition(.scale.combined(with: .opacity))
        } else {
            Circle()
                .fill(Color.red.opacity(0.6))
                .frame(width: 6, height: 6)
                .transition(.scale.combined(with: .opacity))
        }
    }

    private var dotColor: Color {
        if ai == "waiting" { return .yellow }
        switch connection {
        case "connected": return .green
        case "reconnecting": return .yellow
        default: return .red
        }
    }
}

// MARK: - Spinner

struct SpinnerView: View {
    @State private var isAnimating = false

    var body: some View {
        Circle()
            .trim(from: 0.05, to: 0.8)
            .stroke(Color.white, style: StrokeStyle(lineWidth: 2, lineCap: .round))
            .rotationEffect(.degrees(isAnimating ? 360 : 0))
            .animation(.linear(duration: 0.8).repeatForever(autoreverses: false), value: isAnimating)
            .onAppear { isAnimating = true }
    }
}

// MARK: - CVDisplayLink Wrapper

class CVDisplayLinkWrapper {
    private var displayLink: CVDisplayLink?
    private let callback: () -> Bool
    private var stopped = false

    init(callback: @escaping () -> Bool) {
        self.callback = callback
    }

    func start() {
        CVDisplayLinkCreateWithActiveCGDisplays(&displayLink)
        guard let displayLink else { return }

        let opaqueWrapper = Unmanaged.passRetained(self)
        CVDisplayLinkSetOutputCallback(displayLink, { (_, _, _, _, _, userInfo) -> CVReturn in
            guard let userInfo else { return kCVReturnError }
            let wrapper = Unmanaged<CVDisplayLinkWrapper>.fromOpaque(userInfo).takeUnretainedValue()
            guard !wrapper.stopped else { return kCVReturnSuccess }
            let keepRunning = wrapper.callback()
            if !keepRunning {
                wrapper.stopped = true
                if let link = wrapper.displayLink {
                    CVDisplayLinkStop(link)
                }
                DispatchQueue.main.async {
                    wrapper.displayLink = nil
                    Unmanaged<CVDisplayLinkWrapper>.fromOpaque(userInfo).release()
                }
            }
            return kCVReturnSuccess
        }, opaqueWrapper.toOpaque())

        CVDisplayLinkStart(displayLink)
    }

    func stop() {
        stopped = true
        guard let displayLink else { return }
        CVDisplayLinkStop(displayLink)
        self.displayLink = nil
    }
}
