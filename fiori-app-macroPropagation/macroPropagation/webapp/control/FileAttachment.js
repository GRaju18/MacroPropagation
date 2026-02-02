sap.ui.define([
	"sap/ui/core/Control"
], function (Control) {
	"use strict";

	return Control.extend("com.9b.seeds.control.FileAttachment", {
		metadata: {
			properties: {
				fileData: {
					type: "string",
					bindable: "bindable"
				}, // Data for the document.
				fileUrl: {
					type: "string",
					bindable: "bindable"
				}, // Bindable url for the document
				fileType: {
					type: "string",
					defaultValue: "text/plain"
				},
				width: {
					type: "sap.ui.core.CSSSize",
					defaultValue: "400px"
				},
				height: {
					type: "sap.ui.core.CSSSize",
					defaultValue: "400px"
				},
				downloadOnly: {
					type: "boolean",
					defaultValue: false
				},
				downloadName: {
					type: "string",
					defaultValue: "Attachment"
				}
			}
		},

		renderer: {

			renderTextFile: function (oRm, oControl) {

				// oRm.write('<object data="data:'+oControl.getFileType());
				// 							oRm.write(';base64,');
				// 							oRm.write(oControl.getFileData());
				// 							oRm.write('" type="'+oControl.getFileType()+'" ');
				// 							oRm.write('width="'+oControl.getWidth()+'" ');
				// 							oRm.write('height="'+oControl.getHeight()+'"');
				// 							oRm.addStyle('object-fit','contain'); // For devices with lower resolution
				// 							oRm.writeStyles();
				// 							oRm.writeControlData(oControl);
				// 							oRm.write('/>');
	//	console.log('Need to write text document');
				var data = atob(oControl.getFileData());
			//	console.log(data);
				oRm.write('<div');
				oRm.writeControlData(oControl);
				oRm.write('>');
				oRm.write(data);
				oRm.write('</div>');
			},

			renderDownloadOnlyFile: function (oRm, oControl) {
				oRm.write('<div ');
				oRm.writeControlData(oControl);
				oRm.write('>');
				oRm.write('The attachment cannot be rendered on browser.<br/> Please download by clicking on link <br/>');
				oRm.write('If downloaded as unknown file, please rename it to ' + oControl.getDownloadName());
				//			var downloadData = oControl.getFileType()+";charset=utf-8," + encodeURIComponent(atob(oControl.getFileData()));
				var downloadData = oControl.getFileType() + ";base64," + oControl.getFileData();
				oRm.write('<a href="data:' + downloadData + '" download="' + oControl.getDownloadName() + '">Download Attachment</a>');
				oRm.write('</div>');
			},
			render: function (oRm, oControl) {
				//console.log('Rendering function called');
				//oRm.writeControlData(oControl);
				if (oControl.getFileData() != null) {
					if (oControl.getDownloadOnly() == true) {
						// Show the rendering for download only
						this.renderDownloadOnlyFile(oRm, oControl);
					} else {
						if (oControl.getFileType() == 'text/plain') {
							this.renderTextFile(oRm, oControl);
						} else {
							oRm.write('<object data="data:' + oControl.getFileType());
							oRm.write(';base64,');
							oRm.write(oControl.getFileData());
							oRm.write('" type="' + oControl.getFileType() + '" ');
							oRm.write('width="' + oControl.getWidth() + '" ');
							oRm.write('height="' + oControl.getHeight() + '"');
							oRm.addStyle('object-fit', 'contain'); // For devices with lower resolution
							oRm.writeStyles();
							oRm.writeControlData(oControl);
							oRm.write('/>');
						}
					}
				} else if (oControl.getFileUrl() != null) {
					oRm.write('<object data="' + oControl.getFileUrl() + '" ');
					oRm.write('type="' + oControl.getFileType() + '" ');
					oRm.write('width="' + oControl.getWidth() + '" ');
					oRm.write('height="' + oControl.getHeight() + '"');

					oRm.writeControlData(oControl);
					oRm.write('/>');

				}
			}
		}
	});
});