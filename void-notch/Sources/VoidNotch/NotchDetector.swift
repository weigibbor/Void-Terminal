import AppKit

struct NotchGeometry {
    let center: NSPoint
    let width: CGFloat
    let height: CGFloat
    let screenFrame: NSRect
}

final class NotchDetector {
    /// Detect notch geometry using auxiliaryTopLeftArea/auxiliaryTopRightArea (macOS 12+)
    /// Falls back to safe area insets. Returns nil for non-notch Macs.
    static func detect() -> NotchGeometry? {
        guard let screen = builtInDisplay else { return nil }

        if #available(macOS 12.0, *) {
            // Method 1: Use auxiliary areas to calculate exact notch width
            if let leftArea = screen.auxiliaryTopLeftArea,
               let rightArea = screen.auxiliaryTopRightArea {
                let notchLeft = leftArea.maxX
                let notchRight = rightArea.minX
                let notchWidth = max(notchRight - notchLeft, 180)
                let notchHeight: CGFloat = 37 // Standard across all notch MacBooks

                let center = NSPoint(
                    x: screen.frame.midX,
                    y: screen.frame.maxY - notchHeight / 2
                )

                return NotchGeometry(
                    center: center,
                    width: notchWidth,
                    height: notchHeight,
                    screenFrame: screen.frame
                )
            }

            // Method 2: Fallback to safe area insets
            let safeAreaInsets = screen.safeAreaInsets
            if safeAreaInsets.top > 0 {
                let notchHeight = safeAreaInsets.top
                let notchWidth: CGFloat = 180

                let center = NSPoint(
                    x: screen.frame.midX,
                    y: screen.frame.maxY - notchHeight / 2
                )

                return NotchGeometry(
                    center: center,
                    width: notchWidth,
                    height: notchHeight,
                    screenFrame: screen.frame
                )
            }
        }

        return nil
    }

    static var hasNotch: Bool {
        detect() != nil
    }

    /// Find the built-in display (not external monitors)
    private static var builtInDisplay: NSScreen? {
        // The built-in display has a specific display ID
        for screen in NSScreen.screens {
            let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID ?? 0
            if CGDisplayIsBuiltin(screenNumber) != 0 {
                return screen
            }
        }
        // Fallback to main screen
        return NSScreen.main
    }
}
