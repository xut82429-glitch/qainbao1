/**
 * P2P 脚本分享网络
 * 去中心化脚本存储与同步，构建用户生态
 */

import { EventBus } from '../../core/EventBus';

export interface ScriptMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  namespace: string;
  match: string[];
  grant: string[];
  createdAt: number;
  updatedAt: number;
  downloads: number;
  rating: number;
  tags: string[];
}

export interface PeerNode {
  id: string;
  publicKey: string;
  scripts: string[];  // 脚本 ID 列表
  lastSeen: number;
  reputation: number;
}

export interface SyncRequest {
  scriptIds: string[];
  timestamp: number;
}

export interface SyncResponse {
  scripts: Array<{
    metadata: ScriptMetadata;
    code: string;
    signature: string;
  }>;
}

/**
 * 基于 WebRTC 的 P2P 脚本分享网络
 */
export class P2PNetwork {
  private eventBus: EventBus;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private connectedPeers: Map<string, PeerNode> = new Map();
  private localScripts: Map<string, { metadata: ScriptMetadata; code: string }> = new Map();
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * 初始化 P2P 节点
   */
  async initialize(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.broadcastCandidate(event.candidate);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.eventBus.emit('p2p:initialized', { nodeId: this.getNodeId() });
  }

  /**
   * 创建数据通道
   */
  createDataChannel(): RTCDataChannel {
    if (!this.peerConnection) {
      throw new Error('P2P not initialized');
    }

    const channel = this.peerConnection.createDataChannel('scriptmaster-sync', {
      ordered: true,
      maxRetransmits: 3
    });

    this.setupDataChannel(channel);
    return channel;
  }

  /**
   * 设置数据通道处理器
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened');
      this.eventBus.emit('p2p:connected');
    };

    channel.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      this.eventBus.emit('p2p:disconnected');
    };

    this.dataChannel = channel;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'SYNC_REQUEST':
        this.handleSyncRequest(message.data);
        break;
      case 'SYNC_RESPONSE':
        this.handleSyncResponse(message.data);
        break;
      case 'SCRIPT_ANNOUNCE':
        this.handleScriptAnnounce(message.data);
        break;
      case 'PEER_DISCOVERY':
        this.handlePeerDiscovery(message.data);
        break;
    }
  }

  /**
   * 处理同步请求
   */
  private handleSyncRequest(request: SyncRequest): void {
    const scripts = request.scriptIds
      .filter(id => this.localScripts.has(id))
      .map(id => {
        const script = this.localScripts.get(id)!;
        return {
          metadata: script.metadata,
          code: script.code,
          signature: this.signScript(script.code)
        };
      });

    this.sendToPeer({
      type: 'SYNC_RESPONSE',
      data: { scripts }
    });
  }

  /**
   * 处理同步响应
   */
  private handleSyncResponse(response: SyncResponse): void {
    response.scripts.forEach(script => {
      if (this.verifySignature(script.code, script.signature)) {
        this.localScripts.set(script.metadata.id, {
          metadata: script.metadata,
          code: script.code
        });
        this.eventBus.emit('p2p:script-received', script.metadata);
      }
    });
  }

  /**
   * 广播脚本公告
   */
  announceScript(scriptId: string): void {
    const metadata = this.localScripts.get(scriptId)?.metadata;
    if (!metadata) return;

    this.sendToPeer({
      type: 'SCRIPT_ANNOUNCE',
      data: {
        scriptId,
        metadata,
        nodeId: this.getNodeId()
      }
    });
  }

  /**
   * 处理脚本公告
   */
  private handleScriptAnnounce(data: any): void {
    this.eventBus.emit('p2p:script-available', data);
  }

  /**
   * 处理节点发现
   */
  private handlePeerDiscovery(data: any): void {
    const peer: PeerNode = data;
    this.connectedPeers.set(peer.id, peer);
    this.eventBus.emit('p2p:peer-discovered', peer);
  }

  /**
   * 发送消息到对等节点
   */
  sendToPeer(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  /**
   * 广播 ICE candidate
   */
  private broadcastCandidate(candidate: RTCIceCandidate): void {
    // 通过信令服务器广播（实际实现需要 WebSocket 信令服务器）
    console.log('Broadcasting ICE candidate:', candidate);
  }

  /**
   * 获取节点 ID
   */
  getNodeId(): string {
    return chrome.runtime ? chrome.runtime.id : 'unknown';
  }

  /**
   * 签名脚本
   */
  private signScript(code: string): string {
    // 简化实现，实际应使用私钥签名
    return btoa(code).substring(0, 32);
  }

  /**
   * 验证签名
   */
  private verifySignature(code: string, signature: string): boolean {
    // 简化实现，实际应使用公钥验证
    const expected = btoa(code).substring(0, 32);
    return expected === signature;
  }

  /**
   * 添加本地脚本
   */
  addLocalScript(id: string, metadata: ScriptMetadata, code: string): void {
    this.localScripts.set(id, { metadata, code });
    this.announceScript(id);
  }

  /**
   * 请求脚本同步
   */
  requestSync(scriptIds: string[]): void {
    this.sendToPeer({
      type: 'SYNC_REQUEST',
      data: {
        scriptIds,
        timestamp: Date.now()
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.connectedPeers.clear();
  }
}
