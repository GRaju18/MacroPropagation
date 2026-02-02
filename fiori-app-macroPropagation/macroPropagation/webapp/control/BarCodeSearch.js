sap.ui.define([
	"sap/m/InputBase",
	"sap/ui/core/IconPool",
	"sap/m/InputBaseRenderer"
], function (InputBase, IconPool) {
	"use strict";

	return InputBase.extend("com.9b.seeds.control.BarCodeSearch", {

		metadata: {
			events: {
				endButtonPress: {}
			}
		},
		init: function () {
			InputBase.prototype.init.apply(this, arguments);

	/*		this.icon = this.addBeginIcon({
				id: this.getId() + "search",
				src: IconPool.getIconURI("search"),
				noTabStop: true,
				tooltip: "",
				press: this.onDeclineButtonPress.bind(this)
			});*/
			this.icon = this.addEndIcon({
				id: this.getId() + "barcode",
				src: IconPool.getIconURI("bar-code"),
				noTabStop: true,
				tooltip: "",
				press: this.onEndButtonPress.bind(this)
			});

		},
		onEndButtonPress: function () {
			if (this.getEnabled() && this.getEditable()) {
				this.fireEndButtonPress({});
			}
		},
		onDeclineButtonPress: function () {
			if (this.getEnabled() && this.getEditable()) {
				this.setValue("");
			}
		},
		renderer: "sap.m.InputBaseRenderer"
	});
});