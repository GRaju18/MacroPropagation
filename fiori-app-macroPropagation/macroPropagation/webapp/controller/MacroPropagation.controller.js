sap.ui.define([
	"com/9b/MacroPropagation/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/MacroPropagation/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.MacroPropagation.controller.MacroPropagation", {
		formatter: model,

		onInit: function () {
			this.getAppConfigData();
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
		},
		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "MacroPropagation") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				sap.ui.core.BusyIndicator.hide();
				this.getView().byId("macroPropagationTable").clearSelection();
				jsonModel.setProperty("/sIconTab", "CLONECULTIVATION");
				jsonModel.setProperty("/isSingleSelect", false);
				this.loadLicenseData();
			}
		},
		loadLicenseData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/licBusy", true);
			var filters = "?$filter=contains(U_NLCTP, 'Cultivator')";
			this.readServiecLayer("/b1s/v2/U_SNBLIC" + filters, function (data) {
				jsonModel.setProperty("/licBusy", false);
				jsonModel.setProperty("/licenseList", data.value);
				jsonModel.setProperty("/sLinObj", data.value[0]);
				that.loadMasterData();
			});
		},
		onChanageLicenseType: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObj = evt.getParameter("selectedItem").getBindingContext("jsonModel").getObject();
			jsonModel.setProperty("/sLinObj", sObj);
			this.loadMasterData();
		},
		onTabChange: function (evt) {
			this.loadMasterData();
		},
		loadMasterData: function () {
			var that = this;
			var licenseNo;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var selTab = this.byId("phenoTab").getSelectedKey();
			var filters;
			if (selTab == "CLONECULTIVATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'Macro' ";
			} else if (selTab == "PACKAGES") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'Macro_Clone'";
			}

			var orderBy = "&$orderby=BatchNum desc";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters + orderBy, function (data) {
				$.grep(data.value, function (plantData) {
					plantData.U_NSTNM = "";
					if (plantData.ItemName) {
						var strainName = plantData.ItemName.split(" - ");
						if (strainName.length > 0) {
							plantData.U_NSTNM = strainName[0];
						}
					}
				});

				//code for display updated date time
				var cDate = new Date();
				var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "KK:mm:ss a"
				});
				var refreshText = dateFormat.format(cDate);
				jsonModel.setProperty("/refreshText", "Last Updated " + refreshText);
				jsonModel.setProperty("/refreshState", "Success");
				jsonModel.setProperty("/macroPropagationTableData", data.value);
				this.byId("tableHeader1").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader2").setText("Plants (" + data.value.length + ")");
			}, this.getView());
		},
		loadAllData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters1 = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and U_Phase ne 'Seed' ";
			var cSelect1 = "&$select=BatchNum,IntrSerial";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters1 + cSelect1, function (data) {
				jsonModel.setProperty("/allData", data.value);
			});
		},

		openQuickView: function (oEvent, oModel) {
			var oButton = oEvent.getSource();
			var oModel = this.getView().getModel("jsonModel");
			var sPath = oEvent.getSource().getBindingContext("jsonModel").getPath();
			var sObject = oEvent.getSource().getBindingContext("jsonModel").getObject();
			var originalString = sObject.U_BatAttr3;
			var specialChar = ":";
			if (originalString != null) {
				sObject.sourceIDs = originalString.split(specialChar).join('\n');
			} else {
				sObject.sourceIDs = "";
			}
			if (!this.flowQuickView) {
				Fragment.load({
					id: "flowQuickView",
					name: "com.9b.MacroPropagation.view.fragments.VegQuickInfo",
					controller: this
				}).then(function (oQuickView) {
					this.flowQuickView = oQuickView;
					this._configQuickView(oModel, sPath);
					this.flowQuickView.openBy(oButton);
				}.bind(this));
			} else {
				this._configQuickView(oModel, sPath);
				this.flowQuickView.openBy(oButton);
			}
		},
		_configQuickView: function (oModel, sPath) {
			this.getView().addDependent(this.flowQuickView);
			this.flowQuickView.close();
			this.flowQuickView.bindElement(sPath);
			this.flowQuickView.setModel(oModel);
		},
		handleClose: function () {
			this.flowQuickView.close();
		},

		/***method for move clones***/
		moveClones: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var selTab = this.byId("phenoTab").getSelectedKey();
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("macroPropagationTable");
			sItems = table.getSelectedIndices();

			if (sItems.length > 0) {
				//to check same batch selected or not
				var batchIDArray = [];
				$.each(sItems, function (i, e) {
					var sObj = table.getContextByIndex(e).getObject();
					batchIDArray.push(sObj.IntrSerial);
				});
				var allSame = new Set(batchIDArray).size === 1;
				if (allSame == false) {
					sap.m.MessageToast.show("Please select plant from same batch ID");
					return;
				}
				//updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (!this.createCloneDialog) {
					this.createCloneDialog = sap.ui.xmlfragment("createCloneDialog",
						"com.9b.MacroPropagation.view.fragments.CreateClone", this);
					this.getView().addDependent(this.createCloneDialog);
				}
				sap.ui.core.Fragment.byId("createCloneDialog", "avalQty").setValue(sItems.length);
				sap.ui.core.Fragment.byId("createCloneDialog", "phase").setSelectedKey("");
				sap.ui.core.Fragment.byId("createCloneDialog", "location").setSelectedKey("");
				sap.ui.core.Fragment.byId("createCloneDialog", "mDate").setDateValue(new Date());
				this.createCloneDialog.open();
				this.loadCannabisItems();
				this.loadAllData();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		loadCannabisItems: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters4 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 110";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data3) {
				jsonModel.setProperty("/cannabisItemCodeList", data3.value);
			});
		},
		onChangePhase: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var selectPhase = sap.ui.core.Fragment.byId("createCloneDialog", "phase").getSelectedKey();
			if (selectPhase == "Mother") {
				var motherModel = jsonModel.getProperty("/MotherLocatonList");
				jsonModel.setProperty("/LocationList", motherModel);
			} else if (selectPhase == "Vegetation") {
				var cloneModel = jsonModel.getProperty("/CultivationLocatonList");
				jsonModel.setProperty("/LocationList", cloneModel);
			} else {
				var CloneCultivationModel = jsonModel.getProperty("/CloneCultivationLocatonList");
				jsonModel.setProperty("/LocationList", CloneCultivationModel);
			}
		},
		onCloneClose: function () {
			this.createCloneDialog.close();
		},
		onMoveClones: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("macroPropagationTable");
			var Phase = sap.ui.core.Fragment.byId("createCloneDialog", "phase").getSelectedKey();
			var locationID = sap.ui.core.Fragment.byId("createCloneDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("createCloneDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			var that = this;
			var sItems = table.getSelectedIndices();

			//inventory entry to clone item
			//var CloneItemsList = jsonModel.getProperty("/CloneItemsList");
			var innoculateItemArray = [],
				cannabisItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, innoculateItemCode, cannabisItemCode;

			//to check all plants from the same batch selected or partially selected
			var updateObject = table.getContextByIndex(sItems[0]).getObject();
			var batchID = updateObject.IntrSerial;
			var allBatchID = jsonModel.getProperty("/macroPropagationTableData");
			var batchIDArr = [];
			$.each(allBatchID, function (i, e) {
				if (e.IntrSerial === batchID) {
					batchIDArr.push(e);
				}
			});
			if (Phase !== "Macro_Clone") {
				var cannabisItemCodeList = jsonModel.getProperty("/cannabisItemCodeList");
				//inventory entry to Item
				if (sItems.length === batchIDArr.length) {
					$.each(sItems, function (i, e) {
						sObj = table.getContextByIndex(e).getObject();
						var itemName = sObj.ItemName;
						var strainName = itemName.split(" - ")[0];
						$.each(cannabisItemCodeList, function (i, e2) {
							if (e2.ItemName === strainName + " - " + "Cannabis Plant") {
								cannabisItemArray.push(e2);
							}
						});
						if (cannabisItemArray.length > 0) {
							cannabisItemCode = cannabisItemArray[0].ItemCode;
						}
						if (invTraDesDataEntry.length > 0) {
							if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
								invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
									"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
											1].DocumentLines.length -
										1].LineNum + 1,
									"ItemCode": cannabisItemCode,
									"Quantity": 1,
									"WarehouseCode": locationID,
									"BatchNumbers": []
								});
								invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
										.length - 1].BatchNumbers
									.push({
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": locationID,
										"U_Phase": Phase,
										"ManufacturerSerialNumber": sObj.MnfSerial,
										"InternalSerialNumber": sObj.IntrSerial,
										"U_BatAttr3": sObj.U_BatAttr3 + ":" + sObj.IntrSerial, //all sources
									});
							} else {
								payLoadInventory = {
									"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
									"DocDate": createdDate,
									"DocDueDate": createdDate,
									"DocumentLines": [{
										"LineNum": 0,
										"ItemCode": cannabisItemCode,
										"WarehouseCode": locationID,
										"Quantity": 1,
										"BatchNumbers": [{
											"BatchNumber": sObj.BatchNum,
											"Quantity": 1,
											"Location": locationID,
											"U_Phase": Phase,
											"ManufacturerSerialNumber": sObj.MnfSerial,
											"InternalSerialNumber": sObj.IntrSerial,
											"U_BatAttr3": sObj.U_BatAttr3 + ":" + sObj.IntrSerial, //all sources
										}]
									}]
								};
								invTraDesDataEntry.push(payLoadInventory);
							}
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocDate": createdDate,
								"DocDueDate": createdDate,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": cannabisItemCode,
									"WarehouseCode": locationID,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": locationID,
										"U_Phase": Phase,
										"ManufacturerSerialNumber": sObj.MnfSerial,
										"InternalSerialNumber": sObj.IntrSerial,
										"U_BatAttr3": sObj.U_BatAttr3 + ":" + sObj.IntrSerial, //all sources
									}]
								}]
							};
							invTraDesDataEntry.push(payLoadInventory);
						}
					});
				} else {
					var selectedPlants = [];
					var checkedPlantsArray = [];
					var unCheckedPlantsArray = [];
					$.each(sItems, function (i, e) {
						var sObj = table.getContextByIndex(e).getObject();
						selectedPlants.push(sObj);
					});
					$.each(batchIDArr, function (i, e1) {
						$.each(selectedPlants, function (i, sObj) {
							if (sObj.BatchNum === e1.BatchNum && sObj.IntrSerial === e1.IntrSerial) {
								checkedPlantsArray.push(e1);
							}
						});
					});
					unCheckedPlantsArray = batchIDArr.filter(function (el) {
						return !checkedPlantsArray.includes(el);
					});

					var d = new Date();
					var month = '' + (d.getMonth() + 1);
					var day = '' + d.getDate();
					var year = d.getFullYear();
					var uniqueText = year + "" + month + "" + day;
					var itemName = updateObject.ItemName;
					var strainCode = itemName.split(":")[0];
					var cloneData = jsonModel.getProperty("/allData");
					var batchID = that.generateCloneBatchID(uniqueText, strainCode, cloneData);
					cloneData.push({
						"IntrSerial": batchID
					});
					var batchIDNew = that.generateCloneBatchID(uniqueText, strainCode, cloneData);
					//checked plant calls
					$.each(checkedPlantsArray, function (i, sObj) {
						//sObj = table.getContextByIndex(e).getObject();
						var itemName = sObj.ItemName;
						var strainName = itemName.split(" - ")[0];
						$.each(cannabisItemCodeList, function (i, e2) {
							if (e2.ItemName === strainName + " - " + "Cannabis Plant") {
								cannabisItemArray.push(e2);
							}
						});
						if (cannabisItemArray.length > 0) {
							cannabisItemCode = cannabisItemArray[0].ItemCode;
						}
						if (invTraDesDataEntry.length > 0) {
							if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
								invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
									"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
											1].DocumentLines.length -
										1].LineNum + 1,
									"ItemCode": cannabisItemCode,
									"Quantity": 1,
									"WarehouseCode": locationID,
									"BatchNumbers": []
								});
								invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
										.length - 1].BatchNumbers
									.push({
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": locationID,
										"U_Phase": Phase,
										"ManufacturerSerialNumber": sObj.IntrSerial,
										"InternalSerialNumber": batchID,
										"U_BatAttr3": sObj.MnfSerial + ":" + sObj.IntrSerial, //all sources
									});
							} else {
								payLoadInventory = {
									"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
									"DocDate": createdDate,
									"DocDueDate": createdDate,
									"DocumentLines": [{
										"LineNum": 0,
										"ItemCode": cannabisItemCode,
										"WarehouseCode": locationID,
										"Quantity": 1,
										"BatchNumbers": [{
											"BatchNumber": sObj.BatchNum,
											"Quantity": 1,
											"Location": locationID,
											"U_Phase": Phase,
											"ManufacturerSerialNumber": sObj.IntrSerial,
											"InternalSerialNumber": batchID,
											"U_BatAttr3": sObj.MnfSerial + ":" + sObj.IntrSerial, //all sources
										}]
									}]
								};
								invTraDesDataEntry.push(payLoadInventory);
							}
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocDate": createdDate,
								"DocDueDate": createdDate,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": cannabisItemCode,
									"WarehouseCode": locationID,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": locationID,
										"U_Phase": Phase,
										"ManufacturerSerialNumber": sObj.IntrSerial,
										"InternalSerialNumber": batchID,
										"U_BatAttr3": sObj.MnfSerial + ":" + sObj.IntrSerial, //all sources
									}]
								}]
							};
							invTraDesDataEntry.push(payLoadInventory);
						}
					});

					//unchecked plants call
					$.each(unCheckedPlantsArray, function (i, unObj) {
						//sObj = table.getContextByIndex(e).getObject();
						var payLoadUncheckedUpdate = {
							"BatchAttribute1": unObj.IntrSerial,
							"BatchAttribute2": batchIDNew,
							"U_BatAttr3": unObj.U_BatAttr3 + ":" + unObj.IntrSerial, //all sources
						};
						batchUrl.push({
							url: "/b1s/v2/BatchNumberDetails(" + unObj.AbsEntry + ")",
							data: payLoadUncheckedUpdate,
							method: "PATCH"
						});
					});
				}
				$.grep(invTraDesDataEntry, function (invTransObjEntry) {
					batchUrl.push({
						url: "/b1s/v2/InventoryGenEntries",
						data: invTransObjEntry,
						method: "POST"
					});
				});

				//inventory exit to selected Item
				var invTraDesData = [];
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					if (invTraDesData.length > 0) {
						if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
							invTraDesData[invTraDesData.length - 1].DocumentLines.push({
								"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
									1].LineNum + 1,
								"ItemCode": sObj.ItemCode,
								"Quantity": 1,
								"WarehouseCode": sObj.WhsCode,
								"BatchNumbers": []
							});
							invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
								.push({
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								});
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": sObj.ItemCode,
									"WarehouseCode": sObj.WhsCode,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": sObj.WhsCode
									}]
								}]
							};
							invTraDesData.push(payLoadInventory);
						}
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				});
				$.grep(invTraDesData, function (invTransObj) {
					batchUrl.push({
						url: "/b1s/v2/InventoryGenExits",
						data: invTransObj,
						method: "POST"
					});
				});
			} else {
				//only phase change	
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					var payLoadUncheckedUpdate = {
						"U_Phase": "Macro_Clone",
						//"BatchAttribute1": sObj.IntrSerial,
						//"U_BatAttr3": sObj.U_BatAttr3 + ":" + sObj.IntrSerial, //all sources
					};
					batchUrl.push({
						url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
						data: payLoadUncheckedUpdate,
						method: "PATCH"
					});
				});
			}

			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Moved Clone Successfully");
				}
				that.createCloneDialog.close();
				that.createCloneDialog.setBusy(false);
				that.clearData();
				that.loadMasterData();
				that.byId("macroPropagationTable").setSelectedIndex(-1);
			}, this.createCloneDialog);
		},

		/***method start for sell clones***/
		sellClones: function () {
			var that = this;
			var sItems;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var macroPropagationTable = this.getView().byId("macroPropagationTable");
			sItems = macroPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to sell these plants ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = macroPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "Sell"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are sold");
								}
								that.loadMasterData();
								macroPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		//method for send to receiption
		sendToReception: function () {
			var that = this;
			that.loadAllData();
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var macroPropagationTable = this.getView().byId("macroPropagationTable");
			sItems = macroPropagationTable.getSelectedIndices();

			//to check all plants from the same batch selected or partially selected
			var updateObject = macroPropagationTable.getContextByIndex(sItems[0]).getObject();
			var batchID = updateObject.IntrSerial;
			var allBatchID = jsonModel.getProperty("/macroPropagationTableData");
			var batchIDArr = [];
			$.each(allBatchID, function (i, e) {
				if (e.IntrSerial === batchID) {
					batchIDArr.push(e);
				}
			});

			if (sItems.length > 0) {
				//to check same batch selected or not
				var batchIDArray = [];
				$.each(sItems, function (i, e) {
					var sObj = macroPropagationTable.getContextByIndex(e).getObject();
					batchIDArray.push(sObj.IntrSerial);
				});
				var allSame = new Set(batchIDArray).size === 1;
				if (allSame == false) {
					sap.m.MessageToast.show("Please select plant from same batch ID");
					return;
				}

				sap.m.MessageBox.confirm("Are you sure you want to move these plants to Clone Cultivation ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							if (sItems.length === batchIDArr.length) {
								$.each(sItems, function (i, e) {
									sObj = macroPropagationTable.getContextByIndex(e).getObject();
									var payLoadInventoryEntry = {
										U_Phase: "Macro"
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
										data: payLoadInventoryEntry,
										method: "PATCH"
									});
								});
							} else {
								var selectedPlants = [];
								var checkedPlantsArray = [];
								var unCheckedPlantsArray = [];
								$.each(sItems, function (i, e) {
									var sObj = table.getContextByIndex(e).getObject();
									selectedPlants.push(sObj);
								});
								$.each(batchIDArr, function (i, e1) {
									$.each(selectedPlants, function (i, sObj) {
										if (sObj.BatchNum === e1.BatchNum && sObj.IntrSerial === e1.IntrSerial) {
											checkedPlantsArray.push(e1);
										}
									});
								});
								unCheckedPlantsArray = batchIDArr.filter(function (el) {
									return !checkedPlantsArray.includes(el);
								});

								var d = new Date();
								var month = '' + (d.getMonth() + 1);
								var day = '' + d.getDate();
								var year = d.getFullYear();
								var uniqueText = year + "" + month + "" + day;
								var itemName = updateObject.ItemName;
								var strainCode = itemName.split(":")[0];
								var allData = jsonModel.getProperty("/allData");
								var batchID = that.generateCloneBatchID(uniqueText, strainCode, allData);
								allData.push({
									"IntrSerial": batchID
								});
								var batchIDNew = that.generateCloneBatchID(uniqueText, strainCode, allData);

								$.each(checkedPlantsArray, function (i, sObj) {
									//sObj = macroPropagationTable.getContextByIndex(e).getObject();
									var payLoadFloInventoryEntryNew = {
										U_Phase: "Macro",
										BatchAttribute1: sObj.IntrSerial, //source
										BatchAttribute2: batchID, //batch ID
										U_BatAttr3: sObj.U_BatAttr3 + ":" + sObj.IntrSerial, //all source
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
										data: payLoadFloInventoryEntryNew,
										method: "PATCH"
									});
								});

								$.each(unCheckedPlantsArray, function (i, sObj1) {
									//sObj = macroPropagationTable.getContextByIndex(e).getObject();
									var payLoadFloInventoryEntryNew = {
										BatchAttribute1: sObj1.IntrSerial, //source
										BatchAttribute2: batchIDNew, //batch ID
										U_BatAttr3: sObj1.U_BatAttr3 + ":" + sObj1.IntrSerial, //all source
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + sObj1.AbsEntry + ")",
										data: payLoadFloInventoryEntryNew,
										method: "PATCH"
									});
								});
							}

							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for Reception");
								}
								that.loadMasterData();
								macroPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		/*method for destroy plants*/
		performDestroyPlants: function () {
			var that = this;
			var sItems;
			var table = this.getView().byId("macroPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				//check single batch is selected or not
				var batchIDArray = [];
				$.each(sItems, function (i, e) {
					var sObj = table.getContextByIndex(e).getObject();
					batchIDArray.push(sObj.IntrSerial);
				});
				var allSame = new Set(batchIDArray).size === 1;
				if (allSame == false) {
					sap.m.MessageToast.show("Please select same batch ID");
					return;
				}

				if (!this.confirmDestroyDialog) {
					this.confirmDestroyDialog = sap.ui.xmlfragment("ConfirmDestroyPlant", "com.9b.MacroPropagation.view.fragments.DestroyPlant",
						this);
					this.getView().addDependent(this.confirmDestroyDialog);
				}
				this.getView().getModel("jsonModel").setProperty("/oDesctroyPlants", {});
				this.confirmDestroyDialog.bindElement("jsonModel>/oDesctroyPlants");
				sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").setDateValue(new Date());
				that.onLoadWasteReasonMethod();
				this.confirmDestroyDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
				return;
			}
		},
		onCalculateGrossNew: function () {
			var WasteNetWeight = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wasteWt").getValue();
			var WasteUOM = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "uom").getSelectedKey("");
			var BagWeight = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "bagWt").getValue("");
			if (WasteNetWeight != "" && BagWeight != "") {
				if (WasteUOM == 'Grams') {
					var GrossWeight = Number(WasteNetWeight) + Number(BagWeight);
				} else {
					var GrossWeight = (Number(WasteNetWeight) * 1000) + Number(BagWeight);
				}
				sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "grossWt").setValue(GrossWeight);
			}
		},
		onWtChange: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
		},
		onLoadWasteReasonMethod: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			this.readServiecLayer("/b1s/v2/U_NWREA", function (e) {
				jsonModel.setProperty("/WasteReasonsList", e.value);
			});
			var rSelect = "?$select=U_NWTLB";
			this.readServiecLayer("/b1s/v2/NWTHS" + rSelect, function (data) {
				jsonModel.setProperty("/allLableData", data.value);
			});
		},
		onDestroyClose: function () {
			this.confirmDestroyDialog.close();
		},
		onDestroyPlant: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var table = this.getView().byId("macroPropagationTable");
			sItems = table.getSelectedIndices();
			var that = this;
			var uom = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "uom").getSelectedKey();
			var reason = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "reason").getSelectedKey();
			var notes = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "notes").getValue();
			var wRecDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getValue();
			var wasteWt = Number(sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wasteWt").getValue());
			var bagWt = Number(sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "bagWt").getValue());
			var grossWt = Number(sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "grossWt").getValue());
			var plantCount = sItems.length;
			var weightPerPlant = Number(wasteWt) / plantCount;
			if (wasteWt === "" || wasteWt === 0) {
				sap.m.MessageToast.show("Please enter waste weight");
				return;
			} else if (isNaN(wasteWt)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			} else if (uom === "") {
				sap.m.MessageToast.show("Please select waste UOM");
				return;
			} else if (bagWt === "") {
				sap.m.MessageToast.show("Please enter bag weight");
				return;
			} else if (reason === "") {
				sap.m.MessageToast.show("Please select reason");
				return;
			} else if (wRecDate === "") {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			var createDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getDateValue();
			var cDate = this.convertUTCDateTime(createDate);
			var invTraDesData = [],
				metricPayload = [],
				sObj,
				cDate = this.convertUTCDateTime(createDate),
				payLoadInventory,
				batchUrl = [],
				payLoadUpdate, payLoadDestroyCreate;
			var d = new Date();
			var day = d.getDate().toString().padStart(2, "0");
			var month = (d.getMonth() + 1).toString().padStart(2, "0");
			var year = d.getFullYear();
			var uniqueText = year + "" + month + "" + day;
			var allLableData = jsonModel.getProperty("/allLableData");
			var labelID = that.generateLabels(uniqueText, allLableData);

			if (sItems.length > 0) {
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					var itemName = sObj.ItemName;
					var strainName = itemName.split(" - ")[0];
					payLoadDestroyCreate = {
						U_NPLID: sObj.BatchNum,
						U_NWTWT: weightPerPlant.toFixed(2),
						U_NWTUM: uom,
						U_BagWeight: bagWt.toFixed(2), //bag weight
						U_GrossWeight: grossWt.toFixed(2), //gross weight
						U_NDTRS: reason,
						U_NNOTE: notes,
						U_NPQTY: 1,
						U_NCRDT: cDate,
						U_NPBID: sObj.IntrSerial,
						U_NSTNM: strainName,
						U_NLCNM: sObj.WhsCode + " - " + sObj.WhsName, //location
						U_NCLPL: "Plant", // clone or plant
						U_NPHSE: "Micro Propagation", //phase
						U_NWTLB: labelID, //bag labels
						U_NLFID: jsonModel.getProperty("/selectedLicense")
					};
					batchUrl.push({
						url: "/b1s/v2/NDRPL",
						data: payLoadDestroyCreate,
						method: "POST"
					});
					if (invTraDesData.length > 0) {
						if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
							invTraDesData[invTraDesData.length - 1].DocumentLines.push({
								"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
									1].LineNum + 1,
								"ItemCode": sObj.ItemCode,
								"Quantity": 1,
								"WarehouseCode": sObj.WhsCode,
								"BatchNumbers": []
							});
							invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
								.push({
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								});
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": sObj.ItemCode,
									"WarehouseCode": sObj.WhsCode,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": sObj.WhsCode
									}]
								}]
							};
							invTraDesData.push(payLoadInventory);
						}
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				});
				$.grep(invTraDesData, function (invTransObj) {
					batchUrl.push({
						url: "/b1s/v2/InventoryGenExits",
						data: invTransObj,
						method: "POST"
					});
				});

				var selObject = table.getContextByIndex(sItems[0]).getObject();
				var payLoadWasteCreate = {
					U_NPBID: selObject.IntrSerial,
					U_NWTWT: wasteWt.toFixed(2),
					U_NWTUM: uom,
					U_BagWeight: bagWt.toFixed(2), //bag weight
					U_GrossWeight: grossWt.toFixed(2), //gross weight
					U_NWTRS: reason,
					U_NNOTE: notes,
					U_NLFID: jsonModel.getProperty("/selectedLicense"),
					U_NPQTY: sItems.length,
					U_NCRDT: cDate,
					U_NLUDT: that.convertUTCDateTime(new Date()),
					U_NLCNM: selObject.WhsCode + " - " + selObject.WhsName,
					U_NWTLB: labelID, //bag labels
				};
				batchUrl.push({
					url: "/b1s/v2/NWTHS",
					data: payLoadWasteCreate,
					method: "POST"
				});

				jsonModel.setProperty("/errorTxt", []);
				this.createBatchCall(batchUrl, function () {
					var errorTxt = jsonModel.getProperty("/errorTxt");
					if (errorTxt.length > 0) {
						sap.m.MessageBox.error(errorTxt.join("\n"));
					} else {
						sap.m.MessageToast.show("Plant Status Changed Successfully");
					}
					sap.m.MessageToast.show("Plant Status Changed Successfully");
					that.byId("macroPropagationTable").setSelectedIndex(-1);
					that.confirmDestroyDialog.close();
					that.loadMasterData();
				}, this.confirmDestroyDialog);
			} else {
				sap.m.MessageToast.show("Please select atleast one record");
			}
		},

		/*method for Record residue start*/
		performRecordResidue: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			if (!this.reportWasteDialog) {
				this.reportWasteDialog = sap.ui.xmlfragment("rWaste", "com.9b.MacroPropagation.view.fragments.RecordResidue", this);
				this.getView().addDependent(this.reportWasteDialog);
			}
			this.onLoadWasteReasonMethod();
			this.reportWasteDialog.open();

			var allBatchID = jsonModel.getProperty("/macroPropagationTableData");
			var batchIDListArr = [];
			$.each(allBatchID, function (i, e) {
				batchIDListArr.push({
					"IntrSerial": e.IntrSerial,
					"WhsCode": e.WhsCode,
					"WhsName": e.WhsName,
				});
			});
			const uniqueArr = [...new Map(batchIDListArr.map(o => [o.IntrSerial, o])).values()];
			// var UniqueBatchIDList = [new Set(batchIDListArr)];
			jsonModel.setProperty("/UniqueBatchIDList", uniqueArr);
			sap.ui.core.Fragment.byId("rWaste", "batchID").setSelectedKey("");
			sap.ui.core.Fragment.byId("rWaste", "wasteWt").setValue("");
			sap.ui.core.Fragment.byId("rWaste", "uom").setSelectedKey("");
			sap.ui.core.Fragment.byId("rWaste", "bagWt").setValue("");
			sap.ui.core.Fragment.byId("rWaste", "grossWt").setValue("");
			sap.ui.core.Fragment.byId("rWaste", "reason").setSelectedKey("");
			sap.ui.core.Fragment.byId("rWaste", "notes").setValue("");
			sap.ui.core.Fragment.byId("rWaste", "wRecDate").setDateValue(new Date());
		},
		onCalculateGross: function () {
			var WasteNetWeight = sap.ui.core.Fragment.byId("rWaste", "wasteWt").getValue();
			var WasteUOM = sap.ui.core.Fragment.byId("rWaste", "uom").getSelectedKey("");
			var BagWeight = sap.ui.core.Fragment.byId("rWaste", "bagWt").getValue("");
			if (WasteNetWeight != "" && BagWeight != "") {
				if (WasteUOM == 'Grams') {
					var GrossWeight = Number(WasteNetWeight) + Number(BagWeight);
				} else {
					var GrossWeight = (Number(WasteNetWeight) * 1000) + Number(BagWeight);
				}
				sap.ui.core.Fragment.byId("rWaste", "grossWt").setValue(GrossWeight);
			}
		},
		onChangeReportWaste: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
		},
		closeRecordWaste: function () {
			this.reportWasteDialog.close();
		},
		onRecordResidue: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo;
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var macroPropagationTable = this.getView().byId("macroPropagationTable");
			//var batchID = sap.ui.core.Fragment.byId("rWaste", "batchID").getSelectedKey();
			var batchArray = sap.ui.core.Fragment.byId("rWaste", "batchID");
			var batchID = batchArray.getSelectedKey();
			var selObj = batchArray.getSelectedItem().getBindingContext("jsonModel").getObject();
			var wasteWtValue = sap.ui.core.Fragment.byId("rWaste", "wasteWt").getValue();
			var wasteuom = sap.ui.core.Fragment.byId("rWaste", "uom").getSelectedKey();
			var bagWt = Number(sap.ui.core.Fragment.byId("rWaste", "bagWt").getValue());
			var grossWt = Number(sap.ui.core.Fragment.byId("rWaste", "grossWt").getValue());
			var reason = sap.ui.core.Fragment.byId("rWaste", "reason").getSelectedKey();
			var note = sap.ui.core.Fragment.byId("rWaste", "notes").getValue();
			var wRecDate = sap.ui.core.Fragment.byId("rWaste", "wRecDate").getValue();
			var wasteWt = Number(sap.ui.core.Fragment.byId("rWaste", "wasteWt").getValue());
			if (batchID === "") {
				sap.m.MessageToast.show("Please select batch ID");
				return;
			} else if (wasteWtValue === "" || wasteWt === 0) {
				sap.m.MessageToast.show("Please enter waste weight");
				return;
			} else if (isNaN(wasteWtValue)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			} else if (wasteuom === "") {
				sap.m.MessageToast.show("Please select waste UOM");
				return;
			} else if (bagWt === "") {
				sap.m.MessageToast.show("Please enter bag weight");
				return;
			} else if (reason === "") {
				sap.m.MessageToast.show("Please select reason");
				return;
			} else if (wRecDate === "") {
				sap.m.MessageToast.show("Please select Date");
				return;
			} else {
				var d = new Date();
				var day = d.getDate().toString().padStart(2, "0");
				var month = (d.getMonth() + 1).toString().padStart(2, "0");
				var year = d.getFullYear();
				var uniqueText = year + "" + month + "" + day;
				var allLableData = jsonModel.getProperty("/allLableData");
				var labelID = that.generateLabels(uniqueText, allLableData);

				var date = sap.ui.core.Fragment.byId("rWaste", "wRecDate").getDateValue();
				var payLoad = {
					U_NPBID: batchID,
					U_NWTWT: wasteWt.toFixed(2),
					U_NWTUM: wasteuom,
					U_BagWeight: bagWt.toFixed(2), //bag weight
					U_GrossWeight: grossWt.toFixed(2), //gross weight
					U_NWTRS: reason,
					U_NNOTE: note,
					U_NLFID: licenseNo,
					U_NPQTY: 0,
					U_NCRDT: that.convertUTCDateTime(date),
					U_NLUDT: that.convertUTCDateTime(new Date()),
					U_NWTLB: labelID, //bag labels
					U_NLCNM: selObj.WhsCode + " - " + selObj.WhsName, //location
				};
				that.updateServiecLayer("/b1s/v2/NWTHS", function () {
					that.reportWasteDialog.close();
					that.loadMasterData();
					sap.m.MessageToast.show("Record Wastage is Completed");
					macroPropagationTable.clearSelection();
				}, payLoad, "POST", this.reportWasteDialog);
			}
		},

		clearAllFilters: function () {
			var filterTable = this.getView().byId("macroPropagationTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
				filterTable.sort(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
		},
		onFilterTable: function (evt) {
			var customData = evt.getParameter("column").getLabel().getCustomData();
			if (customData.length > 0 && customData[0].getKey() === "DAYS") {
				var sValue = evt.getParameter("value");
				var filters = [new sap.ui.model.Filter("Quantity", "EQ", sValue)];
				this.byId("macroPropagationTable").getBinding("rows").filter(filters);
			}
		},
		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("BatchNum", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NSTNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("ItemName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("MnfSerial", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsCode", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("IntrSerial", "Contains", value.toLowerCase()));
					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("macroPropagationTable").getBinding("rows").filter(andFilter);
		},
		clearData: function () {
			this.byId("macroPropagationTable").clearSelection();
		},
		onPlantsRefresh: function () {
			this.clearAllFilters();
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
			this.loadMasterData();
		},
		handleRowSelection: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("macroPropagationTable");
			sItems = table.getSelectedIndices();
			var sItems;
			if (sItems.length === 1) {
				jsonModel.setProperty("/isSingleSelect", true);
			} else {
				jsonModel.setProperty("/isSingleSelect", false);
			}
		}

	});
});