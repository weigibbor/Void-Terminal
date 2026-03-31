import AppKit

/// Menu bar fallback for Macs without notch.
/// Shows a status icon with connection dot + AI ring indicator.
/// Matches Notchy's tab status dot styling.
final class MenuBarFallback: NSObject {
    private var statusItem: NSStatusItem?
    var onClick: (() -> Void)?

    private var currentConnection: String = "disconnected"
    private var currentAI: String = "idle"
    private var spinTimer: Timer?
    private var spinAngle: CGFloat = 0

    func setup() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        if let button = statusItem?.button {
            button.image = makeIcon()
            button.action = #selector(statusItemClicked)
            button.target = self
        }

        print("[VoidNotch] Menu bar fallback active (no notch detected)")
    }

    func remove() {
        spinTimer?.invalidate()
        spinTimer = nil
        if let item = statusItem {
            NSStatusBar.system.removeStatusItem(item)
        }
        statusItem = nil
    }

    func updateStatus(connection: String, ai: String) {
        let changed = connection != currentConnection || ai != currentAI
        currentConnection = connection
        currentAI = ai

        if changed {
            statusItem?.button?.image = makeIcon()

            // Animate spinner for "working" state
            if ai == "working" && spinTimer == nil {
                spinTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
                    guard let self = self else { return }
                    self.spinAngle += 12 // degrees per frame at 30fps
                    self.statusItem?.button?.image = self.makeIcon()
                }
            } else if ai != "working" {
                spinTimer?.invalidate()
                spinTimer = nil
                spinAngle = 0
            }
        }
    }

    @objc private func statusItemClicked() {
        onClick?()
    }

    private func makeIcon() -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size, flipped: false) { [self] rect in
            let center = NSPoint(x: rect.midX, y: rect.midY)

            // Outer ring (for AI working state)
            if currentAI == "working" {
                let ringRadius: CGFloat = 7.5
                let arcPath = NSBezierPath()
                let startDeg = spinAngle
                let endDeg = startDeg + 270 // 75% arc like Notchy spinner
                arcPath.appendArc(
                    withCenter: center,
                    radius: ringRadius,
                    startAngle: startDeg,
                    endAngle: endDeg,
                    clockwise: false
                )
                arcPath.lineWidth = 1.5
                arcPath.lineCapStyle = .round
                NSColor.white.withAlphaComponent(0.8).setStroke()
                arcPath.stroke()
            }

            // Connection dot (6px, centered)
            let dotSize: CGFloat = 6
            let dotRect = NSRect(
                x: center.x - dotSize / 2,
                y: center.y - dotSize / 2,
                width: dotSize,
                height: dotSize
            )
            let dotPath = NSBezierPath(ovalIn: dotRect)

            let color: NSColor
            switch currentConnection {
            case "connected": color = .systemGreen
            case "reconnecting": color = .systemYellow
            default: color = .systemRed
            }

            color.setFill()
            dotPath.fill()

            return true
        }

        image.isTemplate = false
        return image
    }
}
