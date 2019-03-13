import { AudioWrapper } from './AudioWrapper.js';
import { Playlist } from './Playlist.js';

var actx = new AudioContext();

new Vue({
	el: '#app',
	data: {
		sizes: (function(min, max) {
			var sizes = [];
			for (var i = min; i <= max; ++i) {
				sizes.push(2 ** i);
			}
			return sizes;
		}(8, 14)),
		startThreshold: -25, // -45,
		nextThreshold: -15, // -25,
		endThreshold: -30, // -50
		bufferSize: 0,
		playlist: null,
		loading: false,
		routine: false
	},
	methods: {
		processFile() {
			this.setLoadingState(true);
			var audio = new AudioWrapper(this.$refs.file.files[0], actx, {
				startThreshold: this.startThreshold,
				nextThreshold: this.nextThreshold,
				endThreshold: this.endThreshold,
				bufferSize: this.bufferSize
			});
			audio.prepare().then(() => {
				this.playlist.add(audio.createInstance());
				this.setLoadingState(false);
			});
		},

		setLoadingState(status) {
			this.loading = status;
			this.$forceUpdate();
		},

		recompute(index) {
			this.setLoadingState(true);
			this.playlist.recompute(index, {
				startThreshold: this.startThreshold,
				nextThreshold: this.nextThreshold,
				endThreshold: this.endThreshold,
				bufferSize: this.bufferSize
			}).then(() => {
				this.setLoadingState(false);
			});
		},

		removeFromPlaylist(index) {
			this.playlist.remove(index);
		},

		moveToUp(index) {
			if (index > 0) {
				this.playlist.exchange(index, index - 1);
				this.$forceUpdate();
			}
		},

		moveToDown(index) {
			if (index < this.playlist.audios.length - 1) {
				this.playlist.exchange(index, index + 1);
				this.$forceUpdate();
			}
		},

		doRoutine() {
			if (this.routine) {
				requestAnimationFrame(() => {
					this.doRoutine();
				});
			}
			this.$forceUpdate();
		},

		run() {
			this.routine = true;
			this.doRoutine();
		},

		finish() {
			this.routine = false;
		},

		play() {
			this.playlist.start();
			this.run();
		},

		stop() {
			this.playlist.end();
			this.finish();
		}
	},
	mounted: function() {
		this.playlist = new Playlist;
		this.bufferSize = this.sizes[0];
	}
});
