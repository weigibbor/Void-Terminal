import AppKit
import Carbon.HIToolbox

final class GlobalHotkey {
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    var onTrigger: (() -> Void)?

    // Default: Cmd+Shift+V
    private var modifiers: CGEventFlags = [.maskCommand, .maskShift]
    private var keyCode: CGKeyCode = 9 // 'V' key

    func register() {
        // Check accessibility permission
        let trusted = AXIsProcessTrustedWithOptions(
            [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary
        )

        if !trusted {
            print("[VoidNotch] Accessibility permission not yet granted — hotkey will activate once permitted")
        }

        let mask: CGEventMask = (1 << CGEventType.keyDown.rawValue)

        let callback: CGEventTapCallBack = { _, type, event, refcon -> Unmanaged<CGEvent>? in
            guard let refcon = refcon else { return Unmanaged.passRetained(event) }
            let hotkey = Unmanaged<GlobalHotkey>.fromOpaque(refcon).takeUnretainedValue()

            if type == .keyDown {
                let flags = event.flags
                let code = CGKeyCode(event.getIntegerValueField(.keyboardEventKeycode))

                if code == hotkey.keyCode &&
                   flags.contains(hotkey.modifiers) {
                    DispatchQueue.main.async {
                        hotkey.onTrigger?()
                    }
                    return nil // Consume the event
                }
            }

            // If tap is disabled by timeout, re-enable it
            if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                if let tap = hotkey.eventTap {
                    CGEvent.tapEnable(tap: tap, enable: true)
                }
            }

            return Unmanaged.passRetained(event)
        }

        let refcon = Unmanaged.passUnretained(self).toOpaque()

        eventTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: mask,
            callback: callback,
            userInfo: refcon
        )

        guard let eventTap = eventTap else {
            print("[VoidNotch] Failed to create event tap — check Accessibility permissions")
            return
        }

        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: eventTap, enable: true)

        print("[VoidNotch] Global hotkey registered (Cmd+Shift+V)")
    }

    func unregister() {
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        if let tap = eventTap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        eventTap = nil
        runLoopSource = nil
    }

    func updateHotkey(_ hotkeyString: String) {
        // Parse hotkey string like "cmd+shift+v"
        let parts = hotkeyString.lowercased().split(separator: "+")
        var newModifiers: CGEventFlags = []

        for part in parts {
            switch part {
            case "cmd", "command": newModifiers.insert(.maskCommand)
            case "shift": newModifiers.insert(.maskShift)
            case "alt", "option": newModifiers.insert(.maskAlternate)
            case "ctrl", "control": newModifiers.insert(.maskControl)
            default:
                // Last part is the key
                if let code = keyCodeFor(String(part)) {
                    keyCode = code
                }
            }
        }

        if !newModifiers.isEmpty {
            modifiers = newModifiers
        }

        // Re-register with new binding
        unregister()
        register()
    }

    private func keyCodeFor(_ key: String) -> CGKeyCode? {
        let map: [String: CGKeyCode] = [
            "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7,
            "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14, "r": 15,
            "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22,
            "5": 23, "9": 25, "7": 26, "8": 28, "0": 29, "n": 45, "m": 46,
            "`": 50, "space": 49, "escape": 53,
        ]
        return map[key]
    }
}
