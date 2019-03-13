export class AudioInstance {
	constructor(buffer, data, wrapper) {
		this.data = Object.assign({}, data);
		this.audio = new Audio;
		this.audio.src = buffer;
		this.routine = null;
		this.chained = false;
		this.next = null;
		this.wrapper = wrapper;
	}

	doRoutine(nextTick) {
		this.routine = setTimeout(() => {
			this.doRoutine(nextTick);
		}, nextTick);
		if (this.audio.currentTime > this.data.cues.next && !this.chained) {
			this.doChain();
		}
		if (this.audio.currentTime > this.data.cues.end && !this.audio.paused) {
			this.stop();
		}
	}

	stopRoutine() {
		clearTimeout(this.routine);
		this.routine = null;	
	}

	load() {
		this.audio.load();
	}

	play() {
		this.audio.currentTime = this.data.cues.start;
		this.audio.play();
		this.doRoutine(10);
		this.preloadNext();
	}

	stop() {
		this.stopRoutine();
		this.chained = false;
		this.audio.pause();
	}

	preloadNext() {
		if (!!(this.next)) {
			this.next.load();
		}
	}

	doChain() {
		this.chained = true;
		if (!!(this.next)) {
			this.next.play();
			// TODO do fade out on this?
		}
	}

	chainTo(audio) {
		this.next = audio;
	}
	
	isPlaying() {
		return !!this.audio && !this.audio.paused;
	}
}
