import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var ipcServer: IPCServer!
    private var notchWindow: NotchOverlayWindow?
    private var menuBar: MenuBarFallback?
    private var hotkey = GlobalHotkey()

    // Hover-to-hide tracking (matches Notchy's AppDelegate)
    private var hoverGlobalMonitor: Any?
    private var hoverLocalMonitor: Any?
    private var hoverHideTimer: Timer?
    private var panelOpenedViaHover = false
    private let hoverMargin: CGFloat = 15
    private let hoverHideDelay: TimeInterval = 0.06

    func applicationDidFinishLaunching(_ notification: Notification) {
        let socketPath = ProcessInfo.processInfo.environment["VOID_NOTCH_SOCKET"]
            ?? defaultSocketPath()

        // IPC
        ipcServer = IPCServer(socketPath: socketPath)
        ipcServer.onMessage = { [weak self] message in
            self?.handleMessage(message)
        }
        ipcServer.onClientConnected = {
            print("[VoidNotch] Electron connected")
        }
        ipcServer.onClientDisconnected = {
            print("[VoidNotch] Electron disconnected")
        }
        ipcServer.start()

        // Notch or menu bar
        if NSScreen.builtIn != nil, NotchDetector.hasNotch {
            setupNotchWindow()
        } else {
            setupMenuBar()
        }

        // Global hotkey
        hotkey.onTrigger = { [weak self] in
            self?.ipcServer.send(NotchEvent(type: "hotkey_triggered"))
        }
        hotkey.register()

        // Screen changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )

        print("[VoidNotch] Ready")
    }

    func applicationWillTerminate(_ notification: Notification) {
        hotkey.unregister()
        ipcServer.stop()
        menuBar?.remove()
    }

    // MARK: - Setup

    private func setupNotchWindow() {
        notchWindow = NotchOverlayWindow()

        notchWindow?.onHover = { [weak self] in
            self?.notchHovered()
        }

        notchWindow?.onClick = { [weak self] in
            self?.ipcServer.send(NotchEvent(type: "notch_click"))
        }

        if let w = notchWindow {
            print("[VoidNotch] Notch overlay active — frame: \(w.frame), level: \(w.level.rawValue), visible: \(w.isVisible)")
        }
    }

    private func setupMenuBar() {
        menuBar = MenuBarFallback()
        menuBar?.onClick = { [weak self] in
            self?.ipcServer.send(NotchEvent(type: "notch_click"))
        }
        menuBar?.setup()
    }

    // MARK: - Notch Hover (matches Notchy's hover-to-hide)

    private func notchHovered() {
        guard !panelOpenedViaHover else { return }
        panelOpenedViaHover = true
        ipcServer.send(NotchEvent(type: "notch_hover"))
        startHoverTracking()
    }

    private func startHoverTracking() {
        stopHoverTracking()
        hoverGlobalMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged]) { [weak self] _ in
            self?.checkHoverBounds()
        }
        hoverLocalMonitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged]) { [weak self] event in
            self?.checkHoverBounds()
            return event
        }
    }

    private func stopHoverTracking() {
        hoverHideTimer?.invalidate()
        hoverHideTimer = nil
        if let m = hoverGlobalMonitor { NSEvent.removeMonitor(m); hoverGlobalMonitor = nil }
        if let m = hoverLocalMonitor { NSEvent.removeMonitor(m); hoverLocalMonitor = nil }
    }

    private func checkHoverBounds() {
        guard panelOpenedViaHover else { cancelHoverHide(); return }

        let mouse = NSEvent.mouseLocation
        let inNotch = notchWindow?.frame.insetBy(dx: -hoverMargin, dy: -hoverMargin).contains(mouse) ?? false

        if inNotch {
            cancelHoverHide()
        } else {
            scheduleHoverHide()
        }
    }

    private func scheduleHoverHide() {
        guard hoverHideTimer == nil else { return }
        hoverHideTimer = Timer.scheduledTimer(withTimeInterval: hoverHideDelay, repeats: false) { [weak self] _ in
            guard let self else { return }
            let mouse = NSEvent.mouseLocation
            let inNotch = self.notchWindow?.frame.insetBy(dx: -self.hoverMargin, dy: -self.hoverMargin).contains(mouse) ?? false
            if !inNotch {
                self.ipcServer.send(NotchEvent(type: "notch_unhover"))
                self.notchWindow?.endHover()
                self.panelOpenedViaHover = false
                self.stopHoverTracking()
            }
        }
    }

    private func cancelHoverHide() {
        hoverHideTimer?.invalidate()
        hoverHideTimer = nil
    }

    // MARK: - IPC Messages

    private func handleMessage(_ message: IncomingMessage) {
        switch message {
        case .statusUpdate(let status):
            notchWindow?.updateStatus(
                connection: status.connection,
                ai: status.ai,
                host: status.activeHost
            )
            menuBar?.updateStatus(
                connection: status.connection,
                ai: status.ai
            )

        case .configUpdate(let config):
            if let hotkeyStr = config.hotkey {
                hotkey.updateHotkey(hotkeyStr)
            }

        case .ping:
            ipcServer.send(NotchEvent(type: "pong"))

        case .shutdown:
            NSApp.terminate(nil)
        }
    }

    @objc private func screenChanged() {
        if NotchDetector.hasNotch {
            if notchWindow == nil {
                menuBar?.remove(); menuBar = nil
                setupNotchWindow()
            } else {
                notchWindow?.detectNotchSize()
                notchWindow?.positionAtNotch()
            }
        } else {
            notchWindow?.close(); notchWindow = nil
            if menuBar == nil { setupMenuBar() }
        }
    }

    private func defaultSocketPath() -> String {
        let appSupport = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask
        ).first!.appendingPathComponent("Void Terminal")
        try? FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        return appSupport.appendingPathComponent("void-notch.sock").path
    }
}
