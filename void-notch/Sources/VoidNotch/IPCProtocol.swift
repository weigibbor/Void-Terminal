import Foundation

// MARK: - Electron -> Swift Messages

enum IncomingMessage: Decodable {
    case statusUpdate(StatusUpdate)
    case configUpdate(ConfigUpdate)
    case shutdown
    case ping

    enum CodingKeys: String, CodingKey {
        case type
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "status_update":
            self = .statusUpdate(try StatusUpdate(from: decoder))
        case "config_update":
            self = .configUpdate(try ConfigUpdate(from: decoder))
        case "shutdown":
            self = .shutdown
        case "ping":
            self = .ping
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: container,
                debugDescription: "Unknown message type: \(type)"
            )
        }
    }
}

struct StatusUpdate: Codable {
    let type: String
    let connection: String  // "connected" | "disconnected" | "reconnecting"
    let ai: String          // "working" | "idle"
    let activeHost: String?
    let sessionCount: Int?
}

struct ConfigUpdate: Codable {
    let type: String
    let hotkey: String?
    let theme: String?
}

// MARK: - Swift -> Electron Messages

struct NotchEvent: Codable {
    let type: String  // "ready" | "hotkey_triggered" | "notch_click" | "notch_hover" | "notch_unhover" | "pong"
    let payload: [String: String]?

    init(type: String, payload: [String: String]? = nil) {
        self.type = type
        self.payload = payload
    }

    func toJSON() -> Data? {
        try? JSONEncoder().encode(self)
    }
}
