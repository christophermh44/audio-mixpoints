export class Playlist {
	constructor() {
		this.audios = [];
	}

	add(audio) {
		this.audios.push(audio);
		this.rechainAll();
	}

	remove(index) {
		this.audios.splice(index, 1);
		this.rechainAll();
	}

	exchange(a, b) {
		[this.audios[a], this.audios[b]] = [this.audios[b], this.audios[a]];
		this.rechainAll();
	}

	recompute(index, options) {
		return new Promise((resolve, reject) => {
			var wrapper = this.audios[index].wrapper;
			wrapper.setOptions(options);
			wrapper.prepare().then(() => {
				this.audios[index] = wrapper.createInstance();
				resolve();
			});
		});
	}

	rechainAll() {
		var previous = null;
		this.audios.forEach((audio) => {
			if (previous !== null) {
				previous.chainTo(audio);
			}
			previous = audio;
		});
		this.audios.slice(-1).pop().chainTo(null);
	}

	start() {
		if (this.audios.length > 0) {
			this.audios[0].play();
		}
	}

	end() {
		this.audios.forEach((audio) => {
			audio.stop();
		});
	}
}
