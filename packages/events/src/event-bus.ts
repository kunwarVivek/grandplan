// ============================================
// EVENT BUS - Redis-backed pub/sub
// ============================================

import { generateId } from "@grandplan/core/utils";
import EventEmitter from "eventemitter3";
import Redis from "ioredis";
import type {
	DomainEvent,
	EventHandler,
	EventType,
	EventTypeMap,
} from "./types.js";

const CHANNEL_NAME = "grandplan:events";

export class EventBus {
	private emitter = new EventEmitter();
	private redisPub: Redis | null = null;
	private redisSub: Redis | null = null;
	private isConnected = false;

	async connect(redisUrl: string): Promise<void> {
		if (this.isConnected) return;

		this.redisPub = new Redis(redisUrl, {
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
		});

		this.redisSub = new Redis(redisUrl, {
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
		});

		await this.redisSub.subscribe(CHANNEL_NAME);

		this.redisSub.on("message", (channel, message) => {
			if (channel === CHANNEL_NAME) {
				try {
					const event = JSON.parse(message) as DomainEvent;
					// Emit locally for handlers on this instance
					this.emitter.emit(event.type, event);
				} catch (error) {
					console.error("Failed to parse event message:", error);
				}
			}
		});

		this.isConnected = true;
		console.log("EventBus connected to Redis");
	}

	async disconnect(): Promise<void> {
		if (!this.isConnected) return;

		await this.redisSub?.unsubscribe(CHANNEL_NAME);
		await this.redisSub?.quit();
		await this.redisPub?.quit();

		this.redisSub = null;
		this.redisPub = null;
		this.isConnected = false;
	}

	async emit<K extends EventType>(
		type: K,
		payload: EventTypeMap[K]["payload"],
		metadata: Partial<EventTypeMap[K]["metadata"]> = {},
	): Promise<void> {
		const event: DomainEvent = {
			id: generateId(),
			type,
			aggregateId: (payload as { id?: string }).id ?? generateId(),
			aggregateType: type.split(".")[0],
			payload,
			metadata: {
				timestamp: new Date(),
				...metadata,
			},
		};

		// Emit locally first (for same-process handlers)
		this.emitter.emit(type, event);

		// Publish to Redis for cross-process communication
		if (this.redisPub) {
			await this.redisPub.publish(CHANNEL_NAME, JSON.stringify(event));
		}
	}

	on<K extends EventType>(
		type: K,
		handler: (event: EventTypeMap[K]) => void | Promise<void>,
	): () => void {
		this.emitter.on(type, handler);
		return () => this.emitter.off(type, handler);
	}

	once<K extends EventType>(
		type: K,
		handler: (event: EventTypeMap[K]) => void | Promise<void>,
	): void {
		this.emitter.once(type, handler);
	}

	off<K extends EventType>(
		type: K,
		handler?: (event: EventTypeMap[K]) => void | Promise<void>,
	): void {
		if (handler) {
			this.emitter.off(type, handler);
		} else {
			this.emitter.removeAllListeners(type);
		}
	}

	// Register a class-based handler
	registerHandler<K extends EventType>(
		type: K,
		handler: EventHandler<EventTypeMap[K]>,
	): () => void {
		const wrappedHandler = async (event: EventTypeMap[K]) => {
			try {
				await handler.handle(event);
			} catch (error) {
				console.error(`Event handler failed for ${type}:`, error);
				// Could emit to dead letter queue here
			}
		};

		this.emitter.on(type, wrappedHandler);
		return () => this.emitter.off(type, wrappedHandler);
	}
}

// Singleton instance
export const eventBus = new EventBus();
