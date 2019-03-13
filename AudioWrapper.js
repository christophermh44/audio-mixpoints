import { AudioInstance } from './AudioInstance.js';

export class AudioWrapper {
	constructor(file, audioContext, options) {
		this.audioContext = audioContext;
		this.file = file;
		this.options = Object.assign({
			startThreshold: -45,
			nextThreshold: -25,
			endThreshold: -50,
			bufferSize: 256
		}, options);
		this.cues = {
			start: null,
			next: null
		};
		this.dataAudio = null;
		this.dataBuffer = null;
	}

	setOptions(options) {
		this.options = Object.assign({
			startThreshold: -45,
			nextThreshold: -25,
			endThreshold: -50,
			bufferSize: 256
		}, options);
	}

	prepare() {
		var audioPromise = this.readAudio();
		var buffersAndCuesPromise = new Promise((resolve, reject) => {
			this.readBuffers().then(() => {
				this.computeCues().then((values) => {
					values = values.flat();
					this.cues.start = values[0];
					this.cues.next = values[1];
					this.cues.end = values[2];
					resolve(this);
				});
			});
		});
		return Promise.all([audioPromise, buffersAndCuesPromise]);
	}

	readBuffers() {
		return new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.onload = (e) => {
				this.bufferSource = e.target.result.slice(0);
				resolve();
			};
			reader.readAsArrayBuffer(this.file);
		});
	}

	readAudio() {
		return new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.onload = (e) => {
				this.dataAudio = e.target.result;
				resolve();
			};
			reader.readAsDataURL(this.file);
		});
	}

	computeCues() {
		var forwardPromise = new Promise((resolve, reject) => {
			var bufferForward = this.bufferSource.slice(0);
			this.audioContext.decodeAudioData(bufferForward, (buffer) => {
				var sourceForward = this.audioContext.createBufferSource();
				sourceForward.buffer = buffer;
				this.createCueAnalyser(sourceForward, [this.options.startThreshold], resolve);
			});
		});
		var backwardPromise = new Promise((resolve, reject) => {
			var bufferBackward = this.bufferSource.slice(0);
			this.audioContext.decodeAudioData(bufferBackward, (buffer) => {
				var sourceBackward = this.audioContext.createBufferSource();
				this.reverseBuffer(buffer);
				sourceBackward.buffer = buffer;
				this.createCueAnalyser(sourceBackward, [this.options.nextThreshold, this.options.endThreshold], (values) => {
					resolve(values.map((value) => {
						var length = sourceBackward.buffer.length / sourceBackward.buffer.sampleRate;
						return length - value;
					}));
				});
			});
		});
		return Promise.all([forwardPromise, backwardPromise]);
	}

	createCueAnalyser(source, thresholds, resolve) {
		var values = Array(thresholds.length).fill(0);
		var processor = this.audioContext.createScriptProcessor(this.options.bufferSize, 1, 1);
		var index = 0;
		var found = false;
		var muter = this.audioContext.createGain();
		muter.gain.value = 0;
		processor.onaudioprocess = (e) => {
			if (found) {
				source.stop();
				muter.disconnect();
				return;
			};
			++index;
			var input = e.inputBuffer.getChannelData(0);
			var total = 0;
			for (var i = 0; i < input.length; ++i) {
				total+= input[i] * input[i];
			}
			var rms = Math.sqrt(total / input.length);
			var db = 20 * Math.log10(rms);
			thresholds.forEach((threshold, v) => {
				if (db >= threshold && values[v] === 0) {
					values[v] = this.indexToSeconds(source, index, this.options.bufferSize);
				}
			});
			if (values.filter((value) => {
				return value > 0;
			}).length === thresholds.length || (index * this.options.bufferSize > source.buffer.length)) {
				resolve(values);
			}
		};
		source.connect(processor);
		processor.connect(muter);
		muter.connect(this.audioContext.destination);
		source.start(0);
	}

	reverseBuffer(buffer) {
		for (var i = 0; i < buffer.numberOfChannels; ++i) {
			var channel = buffer.getChannelData(i);
			Array.prototype.reverse.call(channel);
		}
	}

	indexToSeconds(source, index, bufferSize) {
		return (index * bufferSize) / (source.buffer.sampleRate);
	}

	createInstance() {
		return new AudioInstance(this.dataAudio, {
			name: this.file.name,
			cues: this.cues
		}, this);
	}
};
