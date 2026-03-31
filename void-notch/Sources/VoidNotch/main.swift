import AppKit

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate

// Must activate to show windows from a background-launched process
app.setActivationPolicy(.accessory)
app.activate(ignoringOtherApps: true)

app.run()
