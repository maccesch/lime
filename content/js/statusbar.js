var statusbarController = {
	_statusLabel: null,
	
	_getStatusLabel: function() {
		if (!this._statusLabel) {
			this._statusLabel = $F('status-msg');
		}
		return this._statusLabel;
	},
	
	setStatus: function(msg) {
		this._getStatusLabel().setAttribute('label', msg);
	}
};
