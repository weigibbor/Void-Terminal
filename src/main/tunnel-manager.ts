import { Client } from 'ssh2';
import net from 'net';
import { v4 as uuid } from 'uuid';

type TunnelType = 'local' | 'remote' | 'dynamic';

interface Tunnel {
  id: string;
  type: TunnelType;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  server: net.Server | null;
  active: boolean;
}

export class TunnelManager {
  private tunnels = new Map<string, Tunnel>();

  async createLocalForward(
    client: Client,
    localPort: number,
    remoteHost: string,
    remotePort: number,
  ): Promise<{ id: string; success: boolean; error?: string }> {
    const id = uuid();

    return new Promise((resolve) => {
      const server = net.createServer((socket) => {
        client.forwardOut(
          '127.0.0.1',
          localPort,
          remoteHost,
          remotePort,
          (err, stream) => {
            if (err) {
              socket.end();
              return;
            }
            socket.pipe(stream);
            stream.pipe(socket);
          },
        );
      });

      server.on('error', (err) => {
        resolve({ id, success: false, error: err.message });
      });

      server.listen(localPort, '127.0.0.1', () => {
        const tunnel: Tunnel = {
          id,
          type: 'local',
          localPort,
          remoteHost,
          remotePort,
          server,
          active: true,
        };
        this.tunnels.set(id, tunnel);
        resolve({ id, success: true });
      });
    });
  }

  closeTunnel(id: string): boolean {
    const tunnel = this.tunnels.get(id);
    if (!tunnel) return false;

    if (tunnel.server) {
      tunnel.server.close();
    }
    tunnel.active = false;
    this.tunnels.delete(id);
    return true;
  }

  listTunnels(): Tunnel[] {
    return Array.from(this.tunnels.values());
  }

  closeAll(): void {
    for (const tunnel of this.tunnels.values()) {
      if (tunnel.server) tunnel.server.close();
    }
    this.tunnels.clear();
  }
}
