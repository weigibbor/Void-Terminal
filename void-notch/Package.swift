// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VoidNotch",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "VoidNotch",
            path: "Sources/VoidNotch"
        )
    ]
)
