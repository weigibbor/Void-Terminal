import Foundation

final class IPCServer {
    private let socketPath: String
    private var serverHandle: FileHandle?
    private var clientHandle: FileHandle?
    private var serverSocket: Int32 = -1
    private var listening = false
    private let queue = DispatchQueue(label: "dev.voidterminal.notch.ipc")

    var onMessage: ((IncomingMessage) -> Void)?
    var onClientConnected: (() -> Void)?
    var onClientDisconnected: (() -> Void)?

    init(socketPath: String) {
        self.socketPath = socketPath
    }

    func start() {
        queue.async { [weak self] in
            self?.listen()
        }
    }

    func stop() {
        listening = false
        clientHandle?.closeFile()
        clientHandle = nil
        if serverSocket >= 0 {
            close(serverSocket)
            serverSocket = -1
        }
        unlink(socketPath)
    }

    func send(_ event: NotchEvent) {
        guard let data = event.toJSON() else { return }
        queue.async { [weak self] in
            guard let client = self?.clientHandle else { return }
            var payload = data
            payload.append(contentsOf: [0x0A]) // newline delimiter
            client.write(payload)
        }
    }

    // MARK: - Private

    private func listen() {
        // Clean up stale socket
        unlink(socketPath)

        serverSocket = socket(AF_UNIX, SOCK_STREAM, 0)
        guard serverSocket >= 0 else {
            print("[VoidNotch] Failed to create socket")
            return
        }

        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)
        let pathBytes = socketPath.utf8CString
        pathBytes.withUnsafeBufferPointer { buf in
            withUnsafeMutableBytes(of: &addr.sun_path) { rawPath in
                let count = min(buf.count, rawPath.count - 1)
                rawPath.copyBytes(from: UnsafeRawBufferPointer(buf).prefix(count))
            }
        }

        let bindResult = withUnsafePointer(to: &addr) { ptr in
            ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockPtr in
                bind(serverSocket, sockPtr, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard bindResult == 0 else {
            print("[VoidNotch] Failed to bind socket: \(String(cString: strerror(errno)))")
            close(serverSocket)
            return
        }

        guard Darwin.listen(serverSocket, 1) == 0 else {
            print("[VoidNotch] Failed to listen: \(String(cString: strerror(errno)))")
            close(serverSocket)
            return
        }

        listening = true
        print("[VoidNotch] IPC listening on \(socketPath)")

        while listening {
            let clientFd = accept(serverSocket, nil, nil)
            guard clientFd >= 0 else {
                if listening { print("[VoidNotch] Accept failed") }
                continue
            }

            print("[VoidNotch] Client connected")
            clientHandle = FileHandle(fileDescriptor: clientFd, closeOnDealloc: true)

            DispatchQueue.main.async { [weak self] in
                self?.onClientConnected?()
            }

            // Send ready event
            send(NotchEvent(type: "ready"))

            readLoop(clientFd)

            print("[VoidNotch] Client disconnected")
            clientHandle = nil
            DispatchQueue.main.async { [weak self] in
                self?.onClientDisconnected?()
            }
        }
    }

    private func readLoop(_ fd: Int32) {
        let handle = FileHandle(fileDescriptor: fd, closeOnDealloc: false)
        var buffer = Data()

        while listening {
            let chunk = handle.availableData
            if chunk.isEmpty { break } // EOF

            buffer.append(chunk)

            // Process newline-delimited JSON messages
            while let newlineIndex = buffer.firstIndex(of: 0x0A) {
                let messageData = buffer[buffer.startIndex..<newlineIndex]
                buffer = buffer[(newlineIndex + 1)...]

                guard !messageData.isEmpty else { continue }

                do {
                    let message = try JSONDecoder().decode(IncomingMessage.self, from: Data(messageData))
                    DispatchQueue.main.async { [weak self] in
                        self?.onMessage?(message)
                    }
                } catch {
                    print("[VoidNotch] Failed to decode message: \(error)")
                }
            }
        }
    }
}
