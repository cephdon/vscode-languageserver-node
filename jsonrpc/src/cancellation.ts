/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { Event, Emitter } from './events';
import * as Is from './is';

/**
 * Defines a CancellationToken. This interface is not
 * intended to be implemented. A CancellationToken must
 * be created via a CancellationTokenSource.
 */
export interface CancellationToken {
	/**
	 * Is `true` when the token has been cancelled, `false` otherwise.
	 */
	isCancellationRequested: boolean;

	/**
	 * An [event](#Event) which fires upon cancellation.
	 */
	onCancellationRequested: Event<any>;
}

export namespace CancellationToken {

	export const None: CancellationToken = Object.freeze({
		isCancellationRequested: false,
		onCancellationRequested: Event.None
	});

	export const Cancelled: CancellationToken = Object.freeze({
		isCancellationRequested: true,
		onCancellationRequested: Event.None
	});

	export function is(value: any): value is CancellationToken {
		let candidate = value as CancellationToken;
		return candidate === CancellationToken.None
			|| candidate === CancellationToken.Cancelled
			|| (Is.boolean(candidate.isCancellationRequested) && Is.defined(candidate.onCancellationRequested));
	}
}

const shortcutEvent: Event<any> = Object.freeze(function(callback, context?) {
	let handle = setTimeout(callback.bind(context), 0);
	return { dispose() { clearTimeout(handle); } };
});

class MutableToken implements CancellationToken {

	private _isCancelled: boolean = false;
	private _emitter: Emitter<any>;

	public cancel() {
		if (!this._isCancelled) {
			this._isCancelled = true;
			if (this._emitter) {
				this._emitter.fire(undefined);
				this._emitter = undefined;
			}
		}
	}

	get isCancellationRequested(): boolean {
		return this._isCancelled;
	}

	get onCancellationRequested(): Event<any> {
		if (this._isCancelled) {
			return shortcutEvent;
		}
		if (!this._emitter) {
			this._emitter = new Emitter<any>();
		}
		return this._emitter.event;
	}
}

export class CancellationTokenSource {

	private _token: CancellationToken;

	get token(): CancellationToken {
		if (!this._token) {
			// be lazy and create the token only when
			// actually needed
			this._token = new MutableToken();
		}
		return this._token;
	}

	cancel(): void {
		if (!this._token) {
			// save an object by returning the default
			// cancelled token when cancellation happens
			// before someone asks for the token
			this._token = CancellationToken.Cancelled;
		} else {
			(<MutableToken>this._token).cancel();
		}
	}

	dispose(): void {
		this.cancel();
	}
}