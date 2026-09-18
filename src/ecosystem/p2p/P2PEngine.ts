/**
 * ScriptMaster Enterprise - P2P Ecosystem Engine
 * Decentralized script sharing network using WebRTC
 */

import type { PeerInfo, ScriptShare, MarketplaceListing, ScriptReview } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  info: PeerInfo;
  connectedAt: number;
}

interface Message {
  type: 'handshake' | 'script-request' | 'script-response' | 'search' | 'search-result' | 'reputation-update';
  payload: unknown;
  timestamp: number;
}

export class P2PEngine {
  private readonly bootstrapNodes = [
    // Bootstrap nodes for initial peer discovery
    'wss://tracker.scriptmaster.io',
    'wss://tracker2.scriptmaster.io',
  ];

  private peerConnections: Map<string, PeerConnection> = new Map();
  private localPeerId: string = '';
  private localPublicKey: string = '';
  private reputationScore: number = 0;
  private wsConnection: WebSocket | null = null;
  private sharedScripts: Map<string, ScriptShare> = new Map();
  private searchResults: Map<string, MarketplaceListing[]> = new Map();

  constructor() {
    this.localPeerId = this.generatePeerId();
    this.loadKeyPair();
  }

  /**
   * Initialize P2P network connection
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to tracker server for peer discovery
        const trackerUrl = this.bootstrapNodes[0];
        this.wsConnection = new WebSocket(trackerUrl);

        this.wsConnection.onopen = () => {
          console.log('[P2P] Connected to tracker');
          this.registerWithTracker();
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleTrackerMessage(JSON.parse(event.data));
        };

        this.wsConnection.onerror = (error) => {
          console.error('[P2P] Tracker error:', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          console.log('[P2P] Disconnected from tracker');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Register with tracker server
   */
  private registerWithTracker(): void {
    if (!this.wsConnection) return;

    const message = {
      type: 'register',
      peerId: this.localPeerId,
      publicKey: this.localPublicKey,
      reputation: this.reputationScore,
      timestamp: Date.now(),
    };

    this.wsConnection.send(JSON.stringify(message));
  }

  /**
   * Handle messages from tracker
   */
  private handleTrackerMessage(message: Record<string, unknown>): void {
    switch (message.type) {
      case 'peer-list':
        this.handlePeerList(message.peers as PeerInfo[]);
        break;
      case 'peer-intro':
        this.connectToPeer(message.peer as PeerInfo);
        break;
      case 'search-results':
        this.handleSearchResults(message.results as MarketplaceListing[]);
        break;
    }
  }

  /**
   * Handle list of available peers
   */
  private handlePeerList(peers: PeerInfo[]): void {
    for (const peer of peers) {
      if (peer.peerId !== this.localPeerId) {
        this.connectToPeer(peer);
      }
    }
  }

  /**
   * Connect to a specific peer via WebRTC
   */
  async connectToPeer(peerInfo: PeerInfo): Promise<void> {
    if (this.peerConnections.has(peerInfo.peerId)) {
      return; // Already connected
    }

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const connection = new RTCPeerConnection(config);
    
    const peerConnection: PeerConnection = {
      peerId: peerInfo.peerId,
      connection,
      dataChannel: null,
      info: peerInfo,
      connectedAt: Date.now(),
    };

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(peerInfo.peerId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming data channels
    connection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerInfo.peerId);
    };

    // Create offer if we're initiating
    if (peerInfo.reputation > this.reputationScore) {
      try {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        
        this.sendSignalingMessage(peerInfo.peerId, {
          type: 'offer',
          offer: offer,
        });
      } catch (error) {
        console.error('[P2P] Failed to create offer:', error);
      }
    }

    this.peerConnections.set(peerInfo.peerId, peerConnection);
  }

  /**
   * Setup data channel for peer communication
   */
  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) return;

    peerConnection.dataChannel = channel;

    channel.onopen = () => {
      console.log(`[P2P] Data channel open with ${peerId}`);
      this.sendHandshake(peerId);
    };

    channel.onmessage = (event) => {
      this.handlePeerMessage(peerId, JSON.parse(event.data));
    };

    channel.onclose = () => {
      console.log(`[P2P] Data channel closed with ${peerId}`);
      this.peerConnections.delete(peerId);
    };

    channel.onerror = (error) => {
      console.error(`[P2P] Data channel error with ${peerId}:`, error);
    };
  }

  /**
   * Send handshake message to peer
   */
  private sendHandshake(peerId: string): void {
    const message: Message = {
      type: 'handshake',
      payload: {
        peerId: this.localPeerId,
        publicKey: this.localPublicKey,
        reputation: this.reputationScore,
        sharedScriptsCount: this.sharedScripts.size,
      },
      timestamp: Date.now(),
    };

    this.sendToPeer(peerId, message);
  }

  /**
   * Handle messages from peers
   */
  private handlePeerMessage(peerId: string, message: Message): void {
    switch (message.type) {
      case 'handshake':
        this.handleHandshake(peerId, message.payload as Record<string, unknown>);
        break;
      case 'script-request':
        this.handleScriptRequest(peerId, message.payload as { scriptId: string });
        break;
      case 'script-response':
        this.handleScriptResponse(peerId, message.payload as { scriptId: string; code?: string; error?: string });
        break;
      case 'search':
        this.handleSearch(peerId, message.payload as { query: string });
        break;
      case 'search-result':
        this.handlePeerSearchResult(peerId, message.payload as { results: MarketplaceListing[] });
        break;
    }
  }

  /**
   * Share a script to the P2P network
   */
  async shareScript(scriptId: string, metadata: Record<string, unknown>, code: string, license: string): Promise<ScriptShare> {
    const share: ScriptShare = {
      scriptId,
      shareId: uuidv4(),
      owner: this.localPeerId,
      metadata: metadata as never,
      checksum: await this.calculateChecksum(code),
      signature: await this.signData(code),
      license,
      sharedAt: Date.now(),
      downloads: 0,
      rating: 0,
      reviews: [],
    };

    this.sharedScripts.set(scriptId, share);

    // Broadcast to all connected peers
    this.broadcast({
      type: 'script-announce',
      payload: {
        share: share,
        code: code,
      },
      timestamp: Date.now(),
    });

    // Update reputation
    this.updateReputation(5);

    return share;
  }

  /**
   * Request a script from the network
   */
  async requestScript(scriptId: string): Promise<{ code: string; share: ScriptShare } | null> {
    // Broadcast request to all peers
    const requestMessage: Message = {
      type: 'script-request',
      payload: { scriptId },
      timestamp: Date.now(),
    };

    this.broadcast(requestMessage);

    // Wait for response (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 10000);

      // Store resolver for when response arrives
      (this as any).pendingScriptRequests = (this as any).pendingScriptRequests || new Map();
      (this as any).pendingScriptRequests.set(scriptId, { resolve, timeout });
    });
  }

  /**
   * Search for scripts in the network
   */
  searchScripts(query: string): Promise<MarketplaceListing[]> {
    return new Promise((resolve) => {
      const searchId = uuidv4();
      
      // Send search to tracker
      if (this.wsConnection) {
        this.wsConnection.send(JSON.stringify({
          type: 'search',
          searchId,
          query,
          timestamp: Date.now(),
        }));
      }

      // Broadcast to peers
      this.broadcast({
        type: 'search',
        payload: { query, searchId },
        timestamp: Date.now(),
      });

      // Store resolver
      const timeout = setTimeout(() => {
        resolve(this.searchResults.get(searchId) || []);
      }, 5000);

      (this as any).pendingSearches = (this as any).pendingSearches || new Map();
      (this as any).pendingSearches.set(searchId, { resolve, timeout });
    });
  }

  /**
   * Rate and review a script
   */
  async rateScript(scriptId: string, rating: number, comment: string): Promise<void> {
    const share = this.sharedScripts.get(scriptId);
    if (!share) return;

    const review: ScriptReview = {
      reviewer: this.localPeerId,
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      timestamp: Date.now(),
      helpful: 0,
    };

    share.reviews.push(review);
    share.rating = share.reviews.reduce((sum, r) => sum + r.rating, 0) / share.reviews.length;

    // Broadcast review
    this.broadcast({
      type: 'review',
      payload: { scriptId, review },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all connected peers
   */
  private broadcast(message: Message): void {
    for (const peerId of this.peerConnections.keys()) {
      this.sendToPeer(peerId, message);
    }
  }

  /**
   * Send message to specific peer
   */
  private sendToPeer(peerId: string, message: Message): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection?.dataChannel?.readyState === 'open') {
      peerConnection.dataChannel.send(JSON.stringify(message));
    } else if (this.wsConnection) {
      // Relay through tracker if direct connection not available
      this.wsConnection.send(JSON.stringify({
        type: 'relay',
        targetPeerId: peerId,
        message,
      }));
    }
  }

  /**
   * Send signaling message for WebRTC connection
   */
  private sendSignalingMessage(peerId: string, message: Record<string, unknown>): void {
    if (this.wsConnection) {
      this.wsConnection.send(JSON.stringify({
        type: 'signaling',
        targetPeerId: peerId,
        message,
      }));
    }
  }

  /**
   * Calculate checksum of code
   */
  private async calculateChecksum(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sign data with private key (simplified)
   */
  private async signData(data: string): Promise<string> {
    // In production, use proper cryptographic signing
    return btoa(data.substring(0, 100) + this.localPublicKey);
  }

  /**
   * Generate unique peer ID
   */
  private generatePeerId(): string {
    return 'peer_' + uuidv4();
  }

  /**
   * Load or generate key pair
   */
  private async loadKeyPair(): Promise<void> {
    const stored = localStorage.getItem('scriptmaster_peer_key');
    if (stored) {
      this.localPublicKey = stored;
    } else {
      // Generate new key pair
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      
      const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      this.localPublicKey = btoa(String.fromCharCode(...new Uint8Array(exported)));
      localStorage.setItem('scriptmaster_peer_key', this.localPublicKey);
    }
  }

  /**
   * Update reputation score
   */
  private updateReputation(delta: number): void {
    this.reputationScore = Math.max(0, Math.min(1000, this.reputationScore + delta));
  }

  /**
   * Handle handshake from peer
   */
  private handleHandshake(peerId: string, payload: Record<string, unknown>): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.info = {
        ...peerConnection.info,
        reputation: payload.reputation as number,
        scriptsShared: payload.sharedScriptsCount as number,
      };
    }
  }

  /**
   * Handle script request from peer
   */
  private handleScriptRequest(peerId: string, payload: { scriptId: string }): void {
    const share = this.sharedScripts.get(payload.scriptId);
    if (share) {
      // Send script code
      // Note: In production, verify permissions and track downloads
      this.sendToPeer(peerId, {
        type: 'script-response',
        payload: {
          scriptId: payload.scriptId,
          code: '/* script code would go here */',
        },
        timestamp: Date.now(),
      });

      share.downloads++;
      this.updateReputation(1);
    } else {
      this.sendToPeer(peerId, {
        type: 'script-response',
        payload: {
          scriptId: payload.scriptId,
          error: 'Script not found',
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle script response
   */
  private handleScriptResponse(peerId: string, payload: { scriptId: string; code?: string; error?: string }): void {
    const pending = (this as any).pendingScriptRequests?.get(payload.scriptId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(payload.code ? { code: payload.code, share: {} as ScriptShare } : null);
      (this as any).pendingScriptRequests.delete(payload.scriptId);
    }
  }

  /**
   * Handle search request
   */
  private handleSearch(peerId: string, payload: { query: string }): void {
    // Search local shared scripts
    const results: MarketplaceListing[] = [];
    for (const [scriptId, share] of this.sharedScripts.entries()) {
      if (share.metadata.name.toLowerCase().includes(payload.query.toLowerCase())) {
        results.push({
          scriptId,
          title: share.metadata.name,
          description: share.metadata.description || '',
          category: 'user-scripts',
          tags: [],
          author: this.peerConnections.get(peerId)?.info || {} as PeerInfo,
          downloads: share.downloads,
          rating: share.rating,
          featured: false,
          verified: false,
        });
      }
    }

    this.sendToPeer(peerId, {
      type: 'search-result',
      payload: { results },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle search results from peer
   */
  private handlePeerSearchResult(peerId: string, payload: { results: MarketplaceListing[] }): void {
    // Aggregate results
    // Implementation depends on search flow
  }

  /**
   * Handle search results from tracker
   */
  private handleSearchResults(results: MarketplaceListing[]): void {
    // Process and store results
  }

  /**
   * Attempt to reconnect to tracker
   */
  private attemptReconnect(): void {
    setTimeout(() => {
      console.log('[P2P] Attempting to reconnect...');
      this.connect().catch(console.error);
    }, 5000);
  }

  /**
   * Disconnect from P2P network
   */
  disconnect(): void {
    // Close all peer connections
    for (const [, peerConnection] of this.peerConnections.entries()) {
      peerConnection.connection?.close();
    }
    this.peerConnections.clear();

    // Close tracker connection
    this.wsConnection?.close();
    this.wsConnection = null;
  }

  /**
   * Get connected peer count
   */
  getPeerCount(): number {
    return this.peerConnections.size;
  }

  /**
   * Get local peer info
   */
  getLocalPeerInfo(): PeerInfo {
    return {
      peerId: this.localPeerId,
      publicKey: this.localPublicKey,
      reputation: this.reputationScore,
      scriptsShared: this.sharedScripts.size,
      scriptsDownloaded: 0,
      verified: false,
      lastSeen: Date.now(),
    };
  }
}

export const p2pEngine = new P2PEngine();
