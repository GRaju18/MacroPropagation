sap.ui.define([
	"sap/m/InputBase",
	"sap/ui/core/IconPool",
	"sap/m/InputBaseRenderer"
], function (InputBase, IconPool) {
	"use strict";

	return InputBase.extend("com.9b.seeds.control.ChatBotInput", {

		metadata: {
			events: {
				endButtonPress: {}
			}
		},
		init: function () {
			InputBase.prototype.init.apply(this, arguments);
		//	InputBase.addStyleClass("chatBotInput");
	/*		this.icon = this.addBeginIcon({
				id: this.getId() + "search",
				src: IconPool.getIconURI("search"),
				noTabStop: true,
				tooltip: "",
				press: this.onDeclineButtonPress.bind(this)
			});*/
			this.icon = this.addEndIcon({
				id: this.getId() + "feeder-arrow",
				src: IconPool.getIconURI("feeder-arrow"),
				noTabStop: true,
				tooltip: "",
				press: this.onEndButtonPress.bind(this)
			}).addStyleClass("chatbotEnterIcon");

		},
		onEndButtonPress: function () {
		this.setValue(this.getFocusDomRef().value);
			if (this.getEnabled() && this.getEditable()) {
				this.fireChange({});
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