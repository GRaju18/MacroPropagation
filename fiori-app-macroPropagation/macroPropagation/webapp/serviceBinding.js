function initModel() {
	var sUrl = "/9_B1System/b1s/v2/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}