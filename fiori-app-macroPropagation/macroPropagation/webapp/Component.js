sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/9b/MacroPropagation/model/models",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, FlexibleColumnLayoutSemanticHelper, JSONModel) {
	"use strict";

	return UIComponent.extend("com.9b.MacroPropagation.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			var appModel = new JSONModel({
				busy: true,
				delay: 0,
				layout: "OneColumn",
				previousLayout: "",
				actionButtonsInfo: {
					midColumn: {
						fullScreen: false
					}
				},
				strainList: []
			});
			appModel.setSizeLimit(1000);
			this.setModel(appModel, "appModel");

			//set the odata service call model
			var jsonModel = new JSONModel({
				versionInfo: "v1.125.09",
				strainList: [],
				createMode: false,
				serLayerbaseUrl: "https://login.seedandbeyond.com:50000",
				userAuthPayload: {
					"CompanyDB": "QAS",
					"UserName": "SusmitaN",
					"Password": "Sreehan@123"
				},
				//set the app navigation URL model
				serviceLayerbaseUrl: "https://demo.seedandbeyond.com/webx/index.html#",
				target: {
					Strain: "webclient-ext-strainlist-app-content-sapb1strainlist",
					PhenoTrack: "webclient-ext-PhenoTrack-app-v2-content-sapb1PhenoTrack",
					MicroPropagation: "webclient-ext-MicroPropagation-app-v2-content-sapb1MicroPropagation",
					MacroPropagation: "webclient-ext-MacroPropagation-app-v2-content-sapb1MacroPropagation",
					Cultivation: "webclient-ext-Cultivation-app-v2-content-sapb1Cultivation",
					MotherPlanner: "webclient-ext-motherplanner2-app-content-sapb1motherplanner",
					DestroyedPlants: "webclient-ext-destroy-plant-app-content-sapb1destroy-plant",
					Waste: "webclient-ext-waste-record-app-content-sapb1waste-record",
				}
			});
			jsonModel.setSizeLimit(10000);
			this.setModel(jsonModel, "jsonModel");

			// update browser title
			this.getRouter().attachTitleChanged(function (oEvent) {
				var sTitle = oEvent.getParameter("title");
				document.addEventListener('DOMContentLoaded', function () {
					document.title = sTitle;
				});
			});
		},

		//session timeout by susmita
		getSessionTimeOut: function () {
			var fiveMinutesLater = new Date();
			var scs = fiveMinutesLater.setMinutes(fiveMinutesLater.getMinutes() + 1);
			var countdowntime = scs;
			var that = this;
			var x = setInterval(function () {
				var now = new Date().getTime();
				var cTime = countdowntime - now;
				if (cTime < 0) {
					that._getDialog().open();
					clearInterval(x);
				}
			});
		},
		onClose: function () {
			this._getDialog().close();
			//this.getSessionTimeOut();
			clearInterval();
		},
		onSubmit: function () {
			this.getRouter().navTo("dashBoard");
			this._getDialog().close();
			//this.getSessionTimeOut();
			clearInterval();
		},
		getHelper: function (oFCL) {
			//	var oFCL = this.getRootControl().byId("layout"),
			var oParams = jQuery.sap.getUriParameters(),
				oSettings = {
					defaultTwoColumnLayoutType: sap.f.LayoutType.TwoColumnsMidExpanded,
					mode: oParams.get("mode"),
					initialColumnsCount: oParams.get("initial"),
					maxColumnsCount: oParams.get("max")
				};
			return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
		},

		getContentDensityClass: function () {
			this._sContentDensityClass = "sapUiSizeCompact";
			return this._sContentDensityClass;
		}
	});
});