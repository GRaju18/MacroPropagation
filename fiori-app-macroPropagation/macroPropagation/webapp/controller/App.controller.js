sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("com.9b.MacroPropagation.controller.App", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 */
		onInit: function () {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			//	this.getOwnerComponent().getModel().setSizeLimit(100000);

		},

		handleLoginTapped: function () {

			var urlData = this.getOwnerComponent().getModel("pageUrlModel").getData().URLCollection[0];
			var payLoad = {
				"CompanyDB": urlData.CompanyDB,
				"UserName": urlData.UserName,
				"Password": urlData.Password
			};

			var that = this;
			payLoad = JSON.stringify(payLoad);
			$.ajax({
				url: "/b1s/v2/Login",
				data: payLoad,
				type: "POST",
				dataType: "json", // expecting json response
				success: function (data) {
					that.getOwnerComponent().getModel("jsonModel").setProperty("/sessionID", data.SessionId);
					sap.m.MessageToast.show("Login Successful");
					that.getOwnerComponent().getRouter().navTo("shell");
				},
				error: function (error) {
					sap.m.MessageToast.show("Error with authentication");
				}
			});

		}

	});
});