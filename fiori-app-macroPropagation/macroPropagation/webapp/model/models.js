sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		wightDifference: function (w1, w2) {
			return Number(w1) - Number(w2);
		},
		showIntegrationText: function (active) {
			if (active === true) {
				return "Show Details";
			} else {
				return "Add Integration";
			}
		},

		flexLayoutDevice: function (system) {
			if (system.phone) {
				return "Column";
			} else if (system.desktop) {
				return "Row";
			} else if (system.tablet) {
				return "Column";
			}
		},

		flexLayoutDevice1: function (system) {
			if (system.phone) {
				return "Column";
			} else if (system.desktop) {
				return "Row";
			} else if (system.tablet) {
				return "Row";
			}
		},

		innerFlexLayoutDevice: function (system) {
			if (system.phone) {
				return "Column";
			} else if (system.desktop) {
				return "Row";
			} else if (system.tablet) {
				return "Row";
			}
		},

		adjustColumnWidth: function (phone, width) {
			if (phone) {
				return width + "rem";
			} else {
				return 2 * width + "rem";
			}
		},

		formatQtyUnit: function (amount, unit) {
			return "Watered " + amount + " " + unit;
		},
		formatStatusImage: function (status) {
			if (status === "S") {
				return "./images/success.jpg";
			} else if (status === "E") {
				return "./images/cancel.jpg";
			}
		},
		leafLogStatusCode: function (sCode) {
			if (sCode === "200" || sCode === "204") {
				return "Success";
			} else if (sCode === "400" || sCode === "405") {
				return "Error";
			}
		},
		checkForSyncIcon: function (status) {
			if (status === null || status === "SS") {
				return false;
			} else if (status !== "") {
				return true;
			}
		},
		dateDisplay: function (sDate) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "MM-dd-yyyy",
				UTC: true
			});
			var dateFormatted = dateFormat.format(new Date(sDate));
			return dateFormatted;
		},
		visibleBasedCloneType: function (sCloneType) {
			if (sCloneType === "SE" || sCloneType === "RE") {
				return true;
			} else {
				return false;
			}
		}
	};
});