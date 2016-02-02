/*
 * @title WET-BOEW Geomap
 * @overview Displays a dynamic map over which information from additional sources can be overlaid.
 * @license wet-boew.github.io/wet-boew/License-en.html / wet-boew.github.io/wet-boew/Licence-fr.html
 * @author @pjackson28
 */
/*global wet_boew_geomap: false, OpenLayers: false, proj4: false*/
( function( $, window, document, wb ) {
"use strict";

var componentName = "wb-geomap",
	selector = "." + componentName,
	$document = wb.doc,

	// timeout for overlay loading in milliseconds
	overlayTimeout = 2000,
	colourIndex = 0,
	symbolMapArray = [],
	mapArray = [],
	selectedFeature, geomap, i18n, i18nText,

	/*
	 * Plugin users can override these defaults by setting attributes on the html elements that the
	 * selector matches.
	 * For example, adding the attribute data-option1="false", will override option1 for that plugin instance.
	 */
	defaults = {
		overlays: [],
		features: [],
		tables: [],
		useScaleLine: false,
		useMousePosition: false,
		useLegend: false,
		useTab: false,
		useMapControls: true,
		useGeocoder: false,
		useGeolocation: false,
		useAOI: false
	},

//	filterMap = {
//		GREATER_THAN: ">",
//		LESS_THAN: "<",
//		EQUAL_TO: "="
//	},
//	
	/**
	 * @method init
	 * @param {jQuery Event} event Event that triggered this handler
	 */
	init = function( event ) {
		var elm = event.target,
			className = elm.className,
			settings = {},
			$elm, overrides;

		// Filter out any events triggered by descendants
		if ( event.currentTarget === elm ) {
			$elm = $( elm );

			// Only initialize the i18nText once
			if ( !i18nText ) {
				i18n = wb.i18n;
				i18nText = {
					add: i18n( "add" ),
					close: i18n( "close" ),
					colon: i18n( "colon" ),
					hiddenLayer: i18n( "geo-hdnlyr" ),
					toggleLayer: i18n( "geo-tgllyr" ),
					labelSelect: i18n( "geo-lblsel" ),
					select: i18n( "geo-sel" ),
					zoomFeature: i18n( "geo-zmfeat" ),
					zoomin: i18n( "geo-zmin" ),
					zoomout: i18n( "geo-zmout" ),
					zoomworld: i18n( "geo-zmwrld" ),
					baseMapTitle: i18n( "geo-bmapttl" ),
					baseMapURL: i18n( "geo-bmapurl" ),
					baseMapURLTxt: i18n( "geo-bmapurltxt" ),
					scaleline: i18n( "geo-sclln" ),
					mouseposition: i18n( "geo-msepos" ),
					access: i18n( "geo-ally" ),
					accessTitle: i18n( "geo-allyttl" ),
					attribLink: i18n( "geo-attrlnk" ),
					attribTitle: i18n( "geo-attrttl" ),
					ariaMap: i18n( "geo-ariamap" ),
					geoLocationURL: i18n( "geo-locurl-geogratis" ),
					geoCoderPlaceholder: i18n( "geo-loc-placeholder" ),
					geoCoderLabel: i18n( "geo-loc-label" ),
					aoiNorth: i18n( "geo-aoi-north" ),
					aoiEast: i18n( "geo-aoi-east" ),
					aoiSouth: i18n( "geo-aoi-south" ),
					aoiWest: i18n( "geo-aoi-west" ),
					aoiInstructions: i18n( "geo-aoi-instructions" ),
					aoiBtnDraw: i18n( "geo-aoi-btndraw" ),
					aoiBtnClear: i18n( "geo-aoi-btnclear" ),
					aoiBtnClose: i18n( "close" ),
					geolocBtn: i18n( "geo-geoloc-btn" ),
					geolocFail: i18n( "geo-geoloc-fail" ),
					geolocUncapable: i18n( "geo-geoloc-uncapable" ),
					geoLgndGrphc: i18n( "geo-lgnd-grphc" )
				};
			}

			// Class-based overrides - use undefined where no override should occur
			overrides = {
				useScaleLine: className.indexOf( " scaleline " ) !== -1 ? true : undefined,
				useMousePosition: className.indexOf( " position " ) !== -1 ? true : undefined,
				useLegend: className.indexOf( " legend " ) !== -1,
				useTab: className.indexOf( " tab " ) !== -1,
				useMapControls: className.indexOf( " static " ) !== -1 ? false : true,
				useGeocoder: className.indexOf( " geocoder " ) !== -1 ? true : false,
				useGeolocation: className.indexOf( " geolocation " ) !== -1 ? true : false,
				useAOI: className.indexOf( " aoi " ) !== -1 ? true : false
			};

			// Merge default settings with overrides from the selected plugin element.
			$.extend( settings, defaults, overrides, window[ componentName ], wb.getData( $elm, componentName ) );

			// Bind the merged settings to the element node for faster access in other events.
			$elm.data( { settings: settings } );

//			// Set the proj4s object so that openlayers can use proj4.
//			window.Proj4js = {
//				Proj: function( code ) {
//				var newProj4 = proj4( window.Proj4js.defs[ code ] );
//					newProj4.srsCode = code;
//					return newProj4;
//					},
//				defs: proj4.defs,
//				transform: proj4
//			};

			// Set the language for OpenLayers
			//NOT SUPPORTED YET: ol.Lang.setCode( document.documentElement.lang );

			// Set the image path for OpenLayers
			//NOT SUPPORTED YET:ol.ImgPath = wb.getPath( "/assets" ) + "/";

			// Add projection for default base map
			proj4.defs( "EPSG:3978", "+proj=lcc +lat_1=49 +lat_2=77 +lat_0=49 +lon_0=-95 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs" );

			// Set the Geomap object
			geomap = setGeomapObject( $elm );

			geomap.aoiToggle = typeof settings.aoi !== "undefined" && typeof settings.aoi.toggle !== "undefined" ? settings.aoi.toggle : true;
			geomap.aoiExtent = typeof settings.aoi !== "undefined" && typeof settings.aoi.extent !== "undefined" ? settings.aoi.extent : null;

			// Load configuration file
			if ( settings.layersFile ) {
				$.ajax( {
					url: settings.layersFile,
					dataType: "script",
					async: false,
					success: function() {

						// Extend settings with data loaded from the
						// configuration file (through wet_boew_geomap)
						$.extend( settings, wet_boew_geomap );
						createMap( geomap, settings );
					}
				} );
			} else {
				createMap( geomap, settings );
			}

			// If there are overlays, wait before calling the plugins
//			if ( !geomap.overlays ) {
////				refreshPlugins( geomap );
//			}
		}
	},

	/*
	 * Set the geomap array that will be use to generate Geomap
	 */
	setGeomapObject = function( $elm ) {
		var geomap = {
				mapid: $elm.attr( "id" ),
				map: null,
				selectControl: null,
				showAttribNRCan: false,
				queryLayers: [],
				overlays: 0,
				overlaysLoaded: 0,

				// status of overlayLoading (true = still loading)
				overlaysLoading: {}
			},
			$elmMap = $elm.find( ".wb-geomap-map" );

		geomap.gmap = $elmMap.attr( "id", "geomap-map-" + geomap.mapid ).height( $elmMap.width() * 0.8 );
		geomap.glegend = $elm.find( ".wb-geomap-legend" ).attr( "id", "geomap-legend-" + geomap.mapid );
		geomap.glayers = $elm.find( ".wb-geomap-layers" ).attr( "id", "geomap-layers-" + geomap.mapid );

		return geomap;
	},

	addPanZoom = function( geomap ) { return;
//		var panZoom = new ol.control.Zoom();
//		ol.Util.extend( panZoom, {
//			draw: function() {
//
//				// Initialize our internal div
//				var oButtons = this,
//					buttonArray = [
//						"zoomin",
//						"zoomout",
//						"zoomworld"
//					],
//					buttonImg = [
//						"zoom-plus-mini",
//						"zoom-minus-mini",
//						"zoom-world-mini"
//					],
//					len = buttonArray.length,
//					i;
//
//				ol.Control.prototype.draw.apply( oButtons, arguments );
//
//				// Place the controls
//				oButtons.buttons = [];
//
//				for ( i = 0; i !== len; i += 1 ) {
//					oButtons._addButton( buttonArray[ i ], buttonImg[ i ] + ".png" );
//				}
//
//				return oButtons.div;
//			}
//		} );

//		geomap.map.addControl( panZoom );
		//setPanZoom( geomap );
	},

//	setPanZoom = function( geomap ) {
//
//		/*
//		 * Add alt text to map controls and make tab-able
//		 * TODO: Fix in OpenLayers so alt text loaded there rather than overriden here (needs to be i18n)
//		 */
//		var panZoom = geomap.gmap.find( ".olControlPanZoom" )[ 0 ],
//			controls = panZoom.getElementsByTagName( "div" ),
//			len = controls.length,
//			i, control, img, altTxt, actn;
//
//		panZoom.setAttribute( "role", "toolbar" );
//		for ( i = 0; i !== len; i += 1 ) {
//			control = controls[ i ];
//			img = control.getElementsByTagName( "img" )[ 0 ];
//
//			if ( img ) {
//				actn = control.action;
//
//				// Add alt text
//				altTxt = i18nText[ actn ];
//				control.setAttribute( "aria-label", altTxt );
//				control.setAttribute( "title", altTxt );
//				control.setAttribute( "role", "button" );
//				control.className += " olControl" + actn;
//				control.tabIndex = 0;
//				img.setAttribute( "alt", altTxt );
//				img.className += " olControl" + actn;
//			}
//		}
//	},

	/*
	 * Map feature select
	 */
	onFeatureSelect = function( feature ) {
		// TODO don't allow location features to be selectable
		var featureId = feature.getId().replace( /\W/g, "_" );
		$( "#" + featureId ).addClass( "active" );
		$( "#cb_" + featureId ).prop( "checked", true );
	},

	/*
	 * Map feature unselect
	 */
	onFeatureUnselect = function( feature ) {
		var featureId = feature.getId().replace( /\W/g, "_" ),
			popup = feature.popup;
		$( "#" + featureId ).removeClass( "active" );
		$( "#cb_" + featureId ).prop( "checked", false );

		// If there is a popup attached, hide it.
		if ( popup && popup.visible() ) {
			popup.hide();
		}
	},

	getMapInteraction = function( map, interactionType ) {

		var intrctn;
		map.getInteractions().forEach( function ( interaction ) {
			if( interaction instanceof interactionType ) { 
				intrctn = interaction;
			}
		});
		return intrctn;
	},
	
	getMapControl = function( map, controlType ) {
		var ctrl;
		map.getControls().forEach( function ( control ) {
			if( control instanceof controlType ) { 
				ctrl = control; 
			}
		});
		
		return ctrl;
	},

	/*
	 * Select and unselect map feature on click
	 */
	onFeatureClick = function( feature, map ) {
//		var selectControl = getMapInteraction( map, ol.interaction.Select );/*,
//			isSelected = false;*/

//		selectControl.getFeatures().forEach( function( ftr ) {
//			if ( feature.getId === ftr.getId() ) {
//				isSelected = true;
//				return;
//			}
//		});
//
//		if ( isSelected ) { // TODO: migrate to ol3
//			console.log( "isSelected...");
//			selectControl.getFeatures().pop( feature );
//		} else {
//			selectControl.getFeatures().push( feature );
//
//			if ( feature.layer.popups ) {
//
//				// If a popup is already shown, hide it
//				if ( selectedFeature && selectedFeature.popup && selectedFeature.popup.visible() ) {
//					selectedFeature.popup.hide();
//				}
//
//				// If no popup, create it, otherwise show it.
//				if ( !feature.popup ) {
//					createPopup( feature );
//				} else {
//					feature.popup.toggle();
//				}
//			}
//		}
//		
//		console.log( selectControl.getFeatures());
	},

	/*
	 * Create popup
	 */
	createPopup = function( feature ) {

		var popupsInfo = feature.layer.popupsInfo,
			featureid = feature.id.replace( /\W/g, "_" ),
			buttonText = i18nText.close,
			colon = i18nText.colon,
			mapSize = feature.layer.map.size,
			content = "<h3>" + document.getElementById( feature.layer.name ).getAttribute( "aria-label" ) + "</h3>",
			id, height, width, close, name, popup, icon, regex,
			popupsInfoId, popupsInfoWidth, popupsInfoHeight;

		if ( popupsInfo ) {
			popupsInfoId = popupsInfo.id;
			popupsInfoWidth = popupsInfo.width;
			popupsInfoHeight = popupsInfo.height;
			id = ( popupsInfoId ? popupsInfoId : "popup_" ) + "_" + featureid;
			height = popupsInfoHeight ? popupsInfoHeight : mapSize.h / 2;
			width = popupsInfoWidth ? popupsInfoWidth : mapSize.w / 2;
			close = popupsInfoWidth ? popupsInfo.close : true;
			content += popupsInfo.content;

			// update content from feature
			for ( name in feature.attributes ) {
				if ( feature.attributes.hasOwnProperty( name ) && name.length !== 0 ) {
					regex = new RegExp( "_" + name, "igm" );
					content = content.replace( regex, feature.attributes[ name ] );
				}
			}
		} else {
			id = "popup_" + featureid;
			height = mapSize.h / 2;
			width = mapSize.w / 2;
			close = true;

			// Update content from feature
			for ( name in feature.attributes ) {
				if ( feature.attributes.hasOwnProperty( name ) && name.length !== 0 ) {
					content += "<p><strong>" + name + colon + "</strong><br />" + feature.attributes[ name ] + "</p>";
				}
			}
		}

		// create the popup
		popup = new ol.Popup.FramedCloud(
			id,
			feature.geometry.getBounds().getCenterLonLat(),
			new ol.Size( width, height ),
			content,
			null,
			close,
			null
		);

		popup.maxSize = new ol.Size( width, height );
		feature.popup = popup;
		feature.layer.map.addPopup( popup );

		// add wb-icon class
		icon = document.createElement( "span" );
		icon.className = "glyphicon glyphicon-remove-circle close_" + featureid;
		icon.setAttribute( "data-map", geomap.mapid );
		icon.setAttribute( "data-layer", feature.layer.id );
		icon.setAttribute( "data-feature", feature.getId() );
		icon.setAttribute( "aria-label", buttonText );
		icon.setAttribute( "title", buttonText );
		icon.setAttribute( "role", "button" );
		icon.setAttribute( "tabindex", "0" );
		feature.popup.closeDiv.appendChild( icon );
	},

	/*
	 * Create layer holder to add all tabs data (HTML and overlay) and overlay data.
	 */
	createLayerHolder = function( geomap, tab ) {

		// User wants tabs
		if ( tab ) {

			// User has specified where they want to put the tabs
			var $tabs = geomap.glayers.find( ".wb-geomap-tabs" );
			if ( $tabs.length !== 0 ) {

				$tabs
					.attr( {
						"class": "wb-tabs auto-height-none",
						id: "geomap-tabs-" + geomap.mapid
					} );

			// User hasn't specified where they want the tabs
			} else {
				geomap
					.glayers
						.prepend( "<div id='geomap-tabs-" + geomap.mapid +
							"' class='wb-geomap-tabs wb-tabs auto-height-none' style='width: " +
							geomap.glayers.width() + "px;'>" );
			}
		}
	},

	/*
	 * Create a table for vector features added in Load Overlays
	 */
	createTable = function( index, title, caption, datatable ) {

//		return $( "<table class='table " + ( datatable ? " wb-tables" : " table-condensed" ) +
//			"' aria-label='" + title + "' id='overlay_" + index + "'>" + "<caption>" +
//			caption + "</caption><thead></thead><tbody></tbody>" + "</table>" );
		
		return $( "<table class='table" +
				"' aria-label='" + title + "' id='overlay_" + index + "'>" + "<caption>" +
				caption + "</caption><thead></thead><tbody></tbody>" + "</table>" );
	},

	/*
	 * Add layer data
	 */
	addLayerData = function( geomap, featureTable, visibility, olLayerId, tab ) {

		// Add layer to legend
		if ( geomap.glegend.length !== 0 ) {
			addToLegend( geomap, featureTable, visibility, olLayerId );
		}

		var $divLayer = geomap.glayers,
			$parent = $( "<div class='wb-geomap-table-wrapper'></div>" ),
			featureTableId = featureTable[ 0 ].id,
			$layerSection = $( "<section></section>" ),
			$layerTitle = $( "<h4>" + featureTable[ 0 ].attributes[ "aria-label" ].value + "</h4>" );

		// If tabs are specified
		if ( tab && $( ".wb-geomap-tabs" ).length !== 0 ) {
			addToTabs( geomap, featureTable, visibility, olLayerId );

		// Tabs are not specified
		} else {
			$layerSection.append( $layerTitle, $parent.append( featureTable ) );
			$divLayer.append( $layerSection );
			$layerSection.addClass( "panel panel-default" );
			$layerTitle.addClass( "panel-title" );
			$layerTitle.wrap( "<div class='panel-heading'></div>" );
			$parent.wrap( "<div class='panel-body'></div>")
			
		}

		$parent.after( "<div id='msg_" + featureTableId + "'><p>" +
				i18nText.hiddenLayer + "</p></div>" );

		// if layer visibility is false, add the hidden layer message and hide the table data
		visibility ? $( "#msg_" + featureTableId ).fadeOut() : $( "#msg_" + featureTableId ).fadeIn().css( { opacity: 1.0 } );
		visibility ? $parent.fadeIn() : $parent.fadeOut();

	},

	/*
	 * Create Legend
	 */
	addToLegend = function( geomap, featureTable, enabled, olLayerId ) {

		var $featureTable = $( featureTable ),
			featureTableId = featureTable[ 0 ].id,
			glegend = geomap.glegend,
			$fieldset, $ul, checked, $chkBox, $label, $li;

		if ( geomap.glegend ) {

			// If no legend or fieldset add them
			$fieldset = glegend.find( "fieldset" );
			if ( $fieldset.length === 0 ) {
				$fieldset = $( "<fieldset name='legend'><legend class='wb-inv'>" +
					i18nText.toggleLayer + "</legend></fieldset>" ).appendTo( glegend );
			}

			checked = enabled ? "checked='checked'" : "";

			$ul = glegend.find( "ul.geomap-lgnd" );
			if ( $ul.length === 0 ) {
				$ul = $( "<ul class='list-unstyled geomap-lgnd'></ul>" ).appendTo( $fieldset );
			}

			$chkBox = $( "<input type='checkbox' id='cb_" + featureTableId +
				"' class='geomap-lgnd-cbx' value='" + featureTableId +
				"' " + checked + " data-map='" + geomap.mapid +
					"' data-layer='" + olLayerId + "' />" );

			$label = $( "<label>", {
				"for": "cb_" + featureTableId,
				text: $featureTable.attr( "aria-label" )
			} ).prepend( $chkBox );

			$li = $( "<li class='checkbox geomap-lgnd-layer'>" )
					.append( $label, "<div id='sb_" + featureTableId + "'></div>" );

			$ul.append( $li );

			$( "#sb_" + featureTableId ).toggle( enabled );
		}
	},

	/*
	 * Add the layer symbology to the legend
	 */
	symbolizeLegend = function( style, layerName, feature ) {

		var symbolItems = [],
			symbolList = "",
			title = "",
			filter, ruleLen, symbolizer, i, j, rule, spanId;

		if ( typeof style !== "undefined" && style.rule ) { 

			ruleLen = style.rule.length;

			if ( ruleLen ) {

				for ( j = 0; j !== ruleLen; j += 1 ) {
					rule = style.rule[ j ];
					filter = rule.filter;
					symbolizer = rule.init;
					title = "";
					spanId = "ls_" + layerName + "_" + j;

					if ( filter && !rule.name ) {
						if ( filter.name ) {
							title = filter.name;
						} else {
							switch ( filter ) {
								case "EQUAL_TO": 
									title = rule.field + " = " + rule.value[ 0 ];
									break;
								case "GREATER_THAN":
									title = rule.field + " > " + rule.value[ 0 ];
									break;
								case "LESS_THAN":
									title = rule.field + " < " + rule.value[ 0 ];
									break;
								case "BETWEEN":
									title = rule.field + " " + rule.value[ 0 ] + " - " + rule.value[ 1 ];
									break;
							}
						}
					} else if ( rule && rule.name ) {
						title = rule.name;
					}

					symbolList += "<li>" + 
						"<div class='geomap-legend-element'>" +
							"<div id='" + spanId + "' class='geomap-legend-symbol'></div>" + 
							"<span class='geomap-legend-symbol-text'><small>" + title + "</small></span>" +
						"</div>" + 
					"</li>";

					symbolItems.push( { "id": spanId, "feature": feature, "symbolizer": symbolizer } );
				}

			} 
		
		}  else if ( typeof style !== "undefined" && style.type === "unique" ) {

			j = 0;

			for ( var obj in style.init ) {
				spanId = "ls_" + layerName + "_" + j;
				symbolizer = style.init[ obj ];
				title = symbolizer.name ? symbolizer.name : obj;

				symbolList += "<li>" + 
					"<div class='geomap-legend-element'>" +
						"<div id='" + spanId + "' class='geomap-legend-symbol'></div>" + 
						"<span class='geomap-legend-symbol-text'><small>" + title + "</small></span>" +
					"</div>" + 
				"</li>";

				symbolItems.push( { "id": spanId, "feature": feature, "symbolizer": symbolizer } );

				j += 1;
			}
		} else if ( typeof style !== "undefined" && style.type === "symbol" ) {

			spanId = "ls_" + layerName + "_0";
			symbolizer = style.init;
			title = symbolizer.name ? symbolizer.name : "";

			symbolList += "<li>" + 
				"<div class='geomap-legend-element'>" +
					"<div id='" + spanId + "' class='geomap-legend-symbol'></div>" + 
					"<span class='geomap-legend-symbol-text'><small>" + title + "</small></span>" +
				"</div>" + 
			"</li>";

			symbolItems.push( { "id": spanId, "feature": feature, "symbolizer": symbolizer } );
		
		} else {

			spanId = "ls_" + layerName + "_0";
			symbolizer = { "fillColor":  style.fillColor, "strokeColor": style.strokeColor };

			symbolList += "<li>" + 
				"<div class='geomap-legend-element'>" +
					"<div id='" + spanId + "' class='geomap-legend-symbol'></div>" + 
					"<span class='geomap-legend-symbol-text'><small>" + title + "</small></span>" +
				"</div>" + 
			"</li>";

			symbolItems.push( { "id": spanId, "feature": feature, "symbolizer": symbolizer } );

		}

		// append the list to the legend
		$( "#sb_" + layerName ).html( "<ul class='list-unstyled'>" + symbolList + "</ul>" );

		// create the legend symbols
		createLegendSymbols( symbolItems );

	},

	/*
	 * Create legend symbols
	 */
	createLegendSymbols = function( symbolItems ) {

		var len = symbolItems.length,
			i, symbol;

		for ( i = 0, len; i !== len; i += 1 ) {
			symbol = symbolItems[ i ];
			getLegendSymbol( symbol.id, symbol.feature, symbol.symbolizer );
		}
	},

	/*
	 * Get legend symbols
	 */
	getLegendSymbol = function( id, feature, symbolizer ) {

		var colors = defaultColors(), //TODO: symbolizer must have colors else legend won't match

			featureType = feature && feature.getGeometry() ? feature.getGeometry().getType() : "Polygon",
			opacity = symbolizer.fillOpacity ? symbolizer.fillOpacity : symbolizer.graphicOpacity ? symbolizer.graphicOpacity : 1.0,
			fillColor = symbolizer.fillColor ? hexToRGB( symbolizer.fillColor, opacity ) : colors.transparent,
			radius = symbolizer.pointRadius ? symbolizer.pointRadius : 5,
			strokeColor = symbolizer.strokeColor ? hexToRGB( symbolizer.strokeColor ) : colors.transparent,
			strokeWidth = symbolizer.strokeWidth ? symbolizer.strokeWidth : 1,
			externalGraphic = symbolizer.externalGraphic ? symbolizer.externalGraphic : null,
			graphicName = symbolizer.graphicName ? symbolizer.graphicName : null,
			graphicHeight = symbolizer.graphicHeight ? symbolizer.graphicHeight : 30,
			graphicWidth = symbolizer.graphicWidth ? symbolizer.graphicWidth : 30,
			height = graphicHeight < radius*2 ? radius*2: graphicHeight,
			width = graphicWidth < radius*2 ? radius*2: graphicWidth,
			i, len, pseudoFeature, rendererMap, source, style;

		switch ( featureType ) {
			case "Polygon" || "MultiPolygon":
				pseudoFeature = new ol.Feature( {
					geometry : new ol.geom.Polygon( [ [ [ -10, -7 ], [ 10, -7 ],
							[ 10, 7 ], [ -10, 7 ] ] ] )
				} );
				style = getPolygonStyle( {
					fill : new ol.style.Fill( {
						color : fillColor
					} ),
					stroke : new ol.style.Stroke( {
						color : strokeColor,
						width : strokeWidth
						//,lineDash: [1.5, 7.5]
					} )
				} );
				pseudoFeature.setStyle( style );
				break;
			case "Point" || "MultiPoint":
				pseudoFeature = new ol.Feature( {
					geometry : new ol.geom.Point( [ 0, 0 ] )
				} );
				if ( graphicName ) {
					style =  getSymbolStyle( {
						symbol: graphicName,
						fill: new ol.style.Fill( { color: fillColor } ),
						stroke: new ol.style.Stroke( { color: strokeColor } ),
						radius: radius
					} );
				} else if ( externalGraphic ) {
					style =  getIconStyle( { 
						src: externalGraphic, 
						opacity: opacity, 
						size: [ graphicWidth, graphicHeight ]
					} );
				} else {
					style =  getPointStyle ( {
						radius : radius,
						fill : new ol.style.Fill( { color: fillColor } ),
						stroke : new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
					} );
				}
				pseudoFeature.setStyle( style );
				break;
			case "LineString" || "MultiLineString":
				pseudoFeature = new ol.Feature( {
				geometry : new ol.geom.LineString( [ [ -8, -3 ], [ -3, 3 ],
						[ 3, -3 ], [ 8, 3 ] ] )
				} );
				style = getLineStyle ( {
					stroke : new ol.style.Stroke( {
						color : strokeColor,
						width : strokeWidth
					} )
				} );
				pseudoFeature.setStyle( style );
				break;
			default:
				pseudoFeature = new ol.Feature( {
				geometry : new ol.geom.Polygon( [ [ [ -10, -7 ], [ 10, -7 ],
						[ 10, 7 ], [ -10, 7 ] ] ] )
				} );
				style = getPolygonStyle( {
					fill : new ol.style.Fill( {
						color : fillColor
					} ),
					stroke : new ol.style.Stroke( {
						color : strokeColor,
						width : strokeWidth
						//,lineDash: [1.5, 7.5]
					} )
				} );
				pseudoFeature.setStyle( style );
				break;
		}

		// create a map for the symbol
		rendererMap = new ol.Map( {
			controls : [],
			interactions : [],
			layers : [ new ol.layer.Vector( {
				source : new ol.source.Vector()
			} ) ]
		});

		if ( rendererMap ) {
			symbolMapArray.push( rendererMap );
			source = rendererMap.getLayers().item( 0 ).getSource();
			source.clear();
			source.addFeature( pseudoFeature );
		}

		rendererMap.setTarget( id );
		setRendererDimensions( id, rendererMap, pseudoFeature, width, height );

	},

	setRendererDimensions = function( id, map, feature, symbolWidth, symbolHeight ) {

		var gb = feature.getGeometry().getExtent(),
			gw = ol.extent.getWidth( gb ),
			gh = ol.extent.getHeight( gb ),
			el = $( "#" + id );

		/*
		 * Determine resolution based on the following rules:
		 * 1) always use value specified in config
		 * 2) if not specified, use max res based on width or height of element
		 * 3) if no width or height, assume a resolution of 1
		 */
		var resolution = 1;
		if( !resolution ) {
			resolution = Math.max(
					gw / symbolWidth || 0,
					gh / symbolHeight || 0
			) || 1;
		}
		map.setView( new ol.View( {
			minResolution: resolution,
			maxResolution: resolution,
			projection: new ol.proj.Projection( {
				code: '',
				units: 'pixels'
			} )
		} ) );

		// determine height and width of element
		var width = Math.max( symbolWidth, gw / resolution );
		var height = Math.max( symbolHeight, gh / resolution );

		// determine bounds of renderer
		var center = ol.extent.getCenter( gb );
		var bhalfw = width * resolution / 2;
		var bhalfh = height * resolution / 2;
		var bounds = [ center[ 0 ] - bhalfw, center[ 1 ] - bhalfh, center[ 0 ] + bhalfw, center[ 1 ] + bhalfh ];
		el.width( Math.round( width ) );
		el.height( Math.round( height ) );

		map.updateSize();
		map.getView().fit( bounds, map.getSize() );

	},

	/*
	 * Create tabs - one for each layer added
	 */
	addToTabs = function( geomap, featureTable, enabled ) {
		var $div = geomap.glayers.find( ".wb-geomap-tabs" ),
			$tabs = $div.find( "ul" ),
			featureTableId = featureTable[ 0 ].id,
			$parent = $( "<div class='wb-geomap-table-wrapper'></div>" ).append( featureTable ),
			title = featureTable.attr( "aria-label" ),
			$details;

		$details = $( "<details>", {
			id: "details-" + featureTableId
		} ).append( "<summary>" + title + "</summary>", $parent );

		$tabs.append( "<li><a href='#tabs_" + featureTableId + "'>" + title + "</a></li>" );

		$div.append( $details );

		if ( !enabled ) {
			$details.append( "<div id='msg_" + featureTableId + "'><p>" +
				i18nText.hiddenLayer + "</p></div>" );
			$parent.hide();
		}
	},

	defaultColors = function() {

		var fill = hexToRGB( wb.drawColours[ colourIndex ], 0.5 ),
			stroke = hexToRGB( wb.drawColours[ colourIndex ], 1.0 ),
			colors = { fill: fill, stroke: stroke, transparent: [ 0, 0, 0, 0 ] };

			// Increment the colour index
			colourIndex += 1;
			if ( colourIndex === wb.drawColours.length ) {
				colourIndex = 0;
			}

			return colors;
	},

	getStyleBase = function( styleType, fillColor, strokeColor, strokeWidth, symbolType ) {

		var colors = defaultColors(),
			fillColor = fillColor ? fillColor : colors.fill,
			strokeColor = strokeColor ? strokeColor : fillColor ? fillColor : colors.stroke,
			width;

		switch( styleType ) {
//			case "Circle":
//				return new ol.style.Circle();
//				break;
			case "Fill":
				return new ol.style.Fill( { color: fillColor } );
				break;
//			case "Icon":
//				return new ol.style.Icon();
//				break;
//			case "RegularShape":
//				return getSymbolStyle();
//				break;
			case "Stroke":
				width = strokeWidth ? strokeWidth : 1;
				return new ol.style.Stroke( { color: strokeColor, width: width } );
				break;
			default:
				return false;
		}
	},

	StyleFactory = function() {

		var colors = defaultColors(),
			externalGraphic, graphicHeight, graphicWidth, graphicName, style, styles, styleRule, styleType,
			fillColor, opacity, radius, strokeColor,
			strokeWidth, width;

		this.createStyleFunction = function ( theStyle, featureType ) {
			style = theStyle;
			featureType = featureType;
			styleType = style && style.type ? style.type : "default";

			//called on each feature
			return function( feature, resolution ) {

				if ( styleType === "rule" ) {

					return new RuleStyle( feature, featureType );

				} else if ( styleType === "symbol" ) {

					return new SymbolStyle( feature, featureType );

				} else if ( styleType === "default" ) {

					// no style type
					return new DefaultStyle( feature, featureType );

				} else if ( styleType === "unique" ) {

					return new UniqueStyle( feature, featureType );

				}

			}

		}

		var RuleStyle = function ( feature ) {

			var styleRule = style.rule,
				len = styleRule.length,
				operators = {
					"EQUAL_TO": function( a, b ) { return a == b[ 0 ] },
					"GREATER_THAN": function( a, b ) { return a > b[ 0 ] },
					"LESS_THAN": function( a, b ) { return a < b[ 0 ] },
					"BETWEEN": function( a, b ) { return a >= b[ 0 ] && a <= b[ 1 ] }
				},
				featureType = feature && feature.getGeometry() ? feature.getGeometry().getType() : "Polygon",
				rule,ruleFilter;

			for ( var i = 0; i !== len; i += 1 ) {

				// Set the filter
				rule = styleRule[ i ];
				ruleFilter = rule.filter;

				// Set the style elements
				strokeWidth = rule.init.strokeWidth ? rule.init.strokeWidth : 1.0;
				opacity = rule.init.fillOpacity ? rule.init.fillOpacity : 0.5;
				radius = rule.init.pointRadius ? rule.init.pointRadius : 5;
				strokeColor = rule.init.strokeColor ? hexToRGB( rule.init.strokeColor, opacity ) : colors.transparent;
				fillColor = hexToRGB( rule.init.fillColor, opacity );
				graphicName = rule.init.graphicName ? rule.init.graphicName : null;
				externalGraphic = rule.init.externalGraphic ? rule.init.externalGraphic : null;
				graphicHeight = rule.init.graphicHeight ? rule.init.graphicHeight : 25;
				graphicWidth = rule.init.graphicWidth ? rule.init.graphicWidth : 25;

				if ( operators[ ruleFilter ] ( feature.attributes[ rule.field ], rule.value ) ) {

					switch ( featureType ) {
						case "Polygon" || "MultiPolygon":
							return getPolygonStyle( {
								fill: new ol.style.Fill( { color: fillColor } ),
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} )
							break;
						case "Point" || "MultiPoint":
							if ( graphicName ) {
								return getSymbolStyle( {
									symbol: graphicName,
									fill: new ol.style.Fill( { color: fillColor } ),
									stroke: new ol.style.Stroke( { color: strokeColor } ),
									radius: radius
								} );
							} else if ( externalGraphic ) {
								return getIconStyle( { 
									src: externalGraphic, 
									opacity: opacity, 
									size: [ graphicWidth, graphicHeight ]
								} );
							} else {
								return getPointStyle ( {
									radius : radius,
									fill : new ol.style.Fill( { color: fillColor } ),
									stroke : new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
								} );
							}
							break;
						case "LineString" || "MultiLineString":
							return getLineStyle( {
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} )
							break;
						default:
							return getPolygonStyle( {
								fill: new ol.style.Fill( { color: fillColor } ),
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} )
							break;
					}

				}
			}

		}

		var SymbolStyle = function ( feature, featureType ) {

			// Set the style elements
			opacity = style.init.fillOpacity ? style.init.fillOpacity : style.init.graphicOpacity ? style.init.graphicOpacity : 1.0;
			radius = style.init.pointRadius ? style.init.pointRadius : 5;
			strokeColor = style.init.strokeColor ? hexToRGB( style.init.strokeColor, opacity ) : colors.transparent;
			fillColor = hexToRGB( style.init.fillColor, opacity );
			graphicName = style.init.graphicName ? style.init.graphicName : null;
			externalGraphic = style.init.externalGraphic ? style.init.externalGraphic : null;
			graphicHeight = style.init.graphicHeight ? style.init.graphicHeight : 25;
			graphicWidth = style.init.graphicWidth ? style.init.graphicWidth : 25;

			if ( graphicName ) {
				return getSymbolStyle( {
					symbol: style.init.graphicName,
					fill: new ol.style.Fill( { color: fillColor } ),
					stroke: new ol.style.Stroke( { color: strokeColor } ),
					radius: radius
				} );
			} else if ( externalGraphic ) {
				return getIconStyle( { 
					src: externalGraphic, 
					opacity: opacity, 
					size: [ graphicWidth, graphicHeight ]
				} );
			} else {
				return getPointStyle ( {
					radius : radius,
					fill : new ol.style.Fill( { color: fillColor } ),
					stroke : new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
				} );
			}

		}

		var DefaultStyle = function () {

			return [ new ol.style.Style({
				image: new ol.style.Circle({
					fill: new ol.style.Fill( { color: style.fillColor } ),
					stroke: new ol.style.Stroke( { color: style.strokeColor, width: style.strokeWidth } ),
					radius: 5
				}),
				fill: new ol.style.Fill( { color: style.fillColor } ),
				stroke: new ol.style.Stroke( { color: style.strokeColor, width: style.strokeWidth } )
			}) ];

		}

		var UniqueStyle = function ( feature, featureType ) {

			var field = style.field,
				obj, objStyle;

			for ( obj in style.init ) {
				objStyle = style.init[ obj ];
			
				strokeWidth = objStyle.strokeWidth ? objStyle.strokeWidth : 1.0;
				opacity = objStyle.fillOpacity ? objStyle.fillOpacity : 0.5;
				radius = objStyle.pointRadius ? objStyle.pointRadius : 5;
				strokeColor = objStyle.strokeColor ? hexToRGB( objStyle.strokeColor, opacity ) : colors.transparent;
				fillColor = objStyle.fillColor ? hexToRGB( objStyle.fillColor, opacity ) : null;
				name = objStyle.name ? objStyle.name : null;
				graphicHeight = objStyle.graphicHeight ? objStyle.graphicHeight : 25;
				externalGraphic = objStyle.externalGraphic;
				graphicWidth = objStyle.graphicWidth ? objStyle.graphicWidth : 25;
				
				switch ( featureType ) {
					case "Polygon" || "MultiPolygon":
						if ( feature.attributes[ field ] === obj ) {
							return getPolygonStyle( {
								fill: new ol.style.Fill( { color: fillColor } ),
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} )
						}
						break;
					case "Point" || "MultiPoint":
						if ( externalGraphic ) {
							if ( feature.attributes[ field ] === obj ) {
								return getIconStyle( { 
									src: externalGraphic,
									opacity: opacity,
									size: [ graphicWidth, graphicHeight ]
								} );
							}
						} else {
							if ( feature.attributes[ field ] === obj ) {
								return getPointStyle ( {
									radius : radius,
									fill : new ol.style.Fill( { color: fillColor } ),
									stroke : new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
								} );
							}
						}
						break;
					case "LineString" || "MultiLineString":
						if ( feature.attributes[ field ] === obj ) {
							return getLineStyle( {
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} );
						}
						break;
					default:
						if ( feature.attributes[ field ] === obj ) {
							return getPolygonStyle( {
								fill: new ol.style.Fill( { color: fillColor } ),
								stroke: new ol.style.Stroke( { color: strokeColor, width: strokeWidth } )
							} );
						}
						break;
				}

			}

		}

	},

//	getStyleFunction = function( style, featureType ) {
//
//		/* style classes
//		Image - base class
//			Circle
//			Icon
//			RegularShape
//		Fill		
//		Stroke
//		*/
////		console.log( style );
////		console.log( "featureType: " + featureType );
//		
//		var colors = defaultColors(),
//			fillColor, opacity, radius, strokeColor, strokeWidth, width,
//			styleType = style ? style.type : null,
//			i, len, rule, ruleFilter, rules = [], styleRule,
//			func;
//
//		if ( styleType === "rule" ) {
//			// set the rules and add to the style
//			//rules = [];
//			//style = new ol.style.Style();
//			styleRule = style.rule;
//
//			len = styleRule.length;
//			for ( i = 0; i !== len; i += 1 ) {
//
//				// Set the filter
//				rule = styleRule[ i ];
//				console.log( rule );
//
//				ruleFilter = rule.filter;
//
//				// Check to see if logical filter
//				if ( ruleFilter === "AND" || ruleFilter === "OR" || ruleFilter === "NOT" ) {
//
//					filters = [];
//					len2 = rule.filters.length;
//					for ( j = 0; j !== len2; j += 1 ) {
//						rl = rule.filters[ j ];
//						filters.push( getRuleFilter( rl ) );
//					}
//
////					rules.push( new ol.Rule( {
////						filter: new ol.Filter.Logical( {
////							title: rule.title,
////							type: ol.Filter.Logical[ ruleFilter ],
////							filters: filters
////						} ),
////						symbolizer: rule.init
////					} ) );
//					
//					rules.push ( function( feature, resolution ) {
//					      if ( feature.attributes[ "Rank" ] === "3" ) {
//					        return getStyleBase("POINT", null, null, null, null);
//					      } else {
//					        return getStyleBase("POINT", null, null, null, null);
//					      }
//					    }
//					);
//
//				// Check to see if else filter included
//				} else if ( rule.elseFilter === true ) {
//
////					rules.push( new ol.Rule( {
////						title: rule.title,
////						elseFilter: true,
////						symbolizer: rule.init
////					} ) );
//
//				} else {
//
//					colors = defaultColors();
//					width = rule.init.strokeWidth ? rule.init.strokeWidth : 1.0;
//					opacity = rule.init.fillOpacity ? rule.init.fillOpacity : 0.5;
//					radius = rule.init.pointRadius ? rule.init.pointRadius : 5;
//					strokeColor = rule.init.strokeColor ? hexToRGB( rule.init.strokeColor, opacity ) : colors.stroke;
//					fillColor = rule.init.fillColor ? hexToRGB( rule.init.fillColor, opacity ) : colors.fill;
//
//					return function( feature, resolution ) { console.log(feature);
//							if ( feature.attributes[ rule.field ] == rule.value[ 0 ] ) {
//								return [ new ol.style.Style( {
//									image: new ol.style.Circle( {
//										radius: radius,
//										fill: getStyleBase( "Fill", fillColor, null, null, null ),
//										stroke: getStyleBase( "Stroke", null, strokeColor, null, null )
//									} )
//								} ) ];
//							}
//						}
//				}
//			}
//
//			//style.addRules( rules );
//			//stylePrefs[ "default" ] = style;
//			
////			$.each( rules, function( index, rule ){
////				if( index === 0 ) {
////					func = rule;
////				} else {
////					$.extend( func, rule );
////				}
////
////			} );
//
//			//return rules;
//
////		} else if ( styleType === "unique" ) {
////			console.log( "styleType = " + styleType );
////			
////			styleMap.addUniqueValueRules( "default", elmStyle.field, elmStyle.init );
//		} else {
//			fillColor = style ? style.init ? style.init.fillColor : colors.fill: colors.fill,
//			strokeColor = style ? style.init ? style.init.strokeColor : colors.stroke : colors.stroke,
//			strokeWidth = style ? style.init ? style.init.strokeWidth : null : null;
//
//			return new ol.style.Style( {
//				fill: getStyleBase( "Fill", fillColor, null, null),
//				stroke: getStyleBase( "Stroke", null, strokeColor, strokeWidth, null)
//			} );
//		}
//
//	},
	/**
	 * Symbol Style
	 * @param symbolizer { obj } - style attributes
	 */

	//TODO: add stroke width
	getSymbolStyle = function( symbolizer ) {

		var symbols = {
			'square': [ new ol.style.Style( {
				image: new ol.style.RegularShape( {
						fill: symbolizer.fill,
						stroke: symbolizer.stroke,
						points: 4,
						radius: symbolizer.radius,
						angle: Math.PI / 4
					} )
			} ) ],
			'triangle': [ new ol.style.Style( {
				image: new ol.style.RegularShape( {
						fill: symbolizer.fill,
						stroke: symbolizer.stroke,
						points: 3,
						radius: symbolizer.radius,
						rotation: Math.PI / 4,
						angle: 0
					} )
			} ) ],
			'star': [ new ol.style.Style( {
				image: new ol.style.RegularShape( {
						fill: symbolizer.fill,
						stroke: symbolizer.stroke,
						points: 5,
						radius: symbolizer.radius,
						radius2: symbolizer.radius * .4,
						angle: 0
					} )
			} ) ],
			'cross': [ new ol.style.Style( {
				image: new ol.style.RegularShape( {
						fill: symbolizer.fill,
						stroke: symbolizer.stroke,
						points: 4,
						radius: symbolizer.radius,
						radius2: 0,
						angle: 0
					} )
			} ) ],
			'x': [ new ol.style.Style( {
				image: new ol.style.RegularShape( {
						fill: symbolizer.fill,
						stroke: symbolizer.stroke,
						points: 4,
						radius: symbolizer.radius,
						radius2: 0,
						angle: Math.PI / 4
					} )
			} ) ]
		};

		return symbols[ symbolizer.symbol ];
	},

	/**
	 * Icon Style
	 * @param symbolizer { obj } - style attributes
	 */
	getIconStyle = function ( symbolizer ) {

		return [ new ol.style.Style( {
			image: new ol.style.Icon( ( {
				opacity: symbolizer.opacity,
				src: symbolizer.src,
				size: symbolizer.size
			} ) )
		} ) ];

	},

	/**
	 * Point Style
	 * @param symbolizer { obj } - style attributes
	 */
	getPointStyle = function ( symbolizer ) {

		return [ new ol.style.Style( {
			image: new ol.style.Circle( ( {
				radius: symbolizer.radius,
				fill: symbolizer.fill,
				stroke: symbolizer.stroke
			} ) )
		} ) ];

	},

	/**
	 * Polygon Style
	 * @param symbolizer { obj } - style attributes
	 */
	getPolygonStyle = function( symbolizer ) {
		return [ new ol.style.Style( {
			fill: symbolizer.fill,
			stroke: symbolizer.stroke
		} ) ];
	},

	/**
	 * Line Style
	 * @param symbolizer { obj } - style attributes
	 */
	getLineStyle = function( symbolizer ) {
		return [ new ol.style.Style( {
			stroke : symbolizer.stroke
		} ) ];
	},

	// Convert a hexidecimal color string to 0..255 R,G,B for backwards compatibility
	hexToRGB = function( code, alpha ) {

		var hex = ( code + '' ).trim(),
			rgb = null,
			match = hex.match(/^#?(([0-9a-zA-Z]{3}){1,3})$/),
			a = alpha ? alpha : 1.0;

		// Not a hex color code, return input
		if( !match ) { return code; }

		hex = match[ 1 ];
		// check if 6 letters are provided
		if ( hex.length == 6 ) {
			rgb = [ parseInt( hex.substring( 0, 2 ), 16 ), parseInt( hex.substring( 2, 4 ), 16 ), parseInt(hex.substring( 4, 6 ), 16 ), a ];
		} else if ( hex.length == 3 ) {
			rgb = [ parseInt( hex.substring( 0, 1 ) + hex.substring( 0, 1 ), 16 ), parseInt( hex.substring( 1, 2 ) + hex.substring( 1, 2 ), 16 ), parseInt( hex.substring( 2, 3 ) + hex.substring( 2, 3 ), 16 ), a ];
		}

		return rgb;
	},

	/*
	 * Generate StyleMap
	 */
//	getStyleMap = function( elm ) { return;
//		var styleMap, rules, rule, i, j, len, len2, style, styleType,
//			stylePrefs, styleRule, styleSelect, ruleFilter, rl, filters,
//			colors = defaultColors(),
//			elmStyle = elm.style;
//		
//		// If style is supplied, create it. If not, create the default one.
//		if ( elmStyle ) {
//
//			// Check the style type (by default, no type are supplied).
//			styleType = elmStyle.type;
//			styleSelect = elmStyle.select;
//			stylePrefs = {
//				select: new ol.style.Style( styleSelect ? styleSelect : selectStyle )
//			};
//
//			if ( styleType === "rule" ) {
//
//				// set the rules and add to the style
//				rules = [];
//				style = new ol.style.Style();
//				styleRule = elmStyle.rule;
//				len = styleRule.length;
//				for ( i = 0; i !== len; i += 1 ) {
//
//					// Set the filter
//					rule = styleRule[ i ];
//					ruleFilter = rule.filter;
//
//					// Check to see if logical filter
//					if ( ruleFilter === "AND" || ruleFilter === "OR" || ruleFilter === "NOT" ) {
//
//						filters = [];
//						len2 = rule.filters.length;
//						for ( j = 0; j !== len2; j += 1 ) {
//							rl = rule.filters[ j ];
//							filters.push( getRuleFilter( rl ) );
//						}
//
//						rules.push( new ol.Rule( {
//							filter: new ol.Filter.Logical( {
//								title: rule.title,
//								type: ol.Filter.Logical[ ruleFilter ],
//								filters: filters
//							} ),
//							symbolizer: rule.init
//						} ) );
//
//					// Check to see if else filter included
//					} else if ( rule.elseFilter === true ) {
//
//						rules.push( new ol.Rule( {
//							title: rule.title,
//							elseFilter: true,
//							symbolizer: rule.init
//						} ) );
//
//					} else {
//						rules.push( getRuleFilter( rule ) );
//					}
//				}
//
//				style.addRules( rules );
//				stylePrefs[ "default" ] = style;
//
//			} else if ( styleType !== "unique" ) {
//				stylePrefs[ "default" ] = new ol.Style( elmStyle.init );
//			}
//		} else {
//			stylePrefs = {
//				"default": new ol.style.Style( defaultStyle ),
//				select: new ol.style.Style( selectStyle )
//			};
//		}
//
//		styleMap = new ol.StyleMap( stylePrefs );
//
//		if ( elmStyle && styleType === "unique" ) {
//			styleMap.addUniqueValueRules( "default", elmStyle.field, elmStyle.init );
//		}
//
//		return styleMap;
//	},


	/*
	 * Create a linked table row
	 *
	 * TODO: provide for an array of configured table columns.
	 */
	createRow = function( geomap, context, zoom, mapControl ) {

		// Add a row for each feature
		var feature = context.feature,
			attributes = feature.attributes,
			isHead = context.type === "head",
			row, key;


		if ( isHead ) {
			row = "<tr><th>" + i18nText.select + "</th>";
		} else {
			row = "<tr>" + addChkBox( geomap, feature );
		}

		for ( key in attributes ) {
			if ( attributes.hasOwnProperty( key ) ) {

				// TODO: add regex to replace text links with hrefs.
				if ( isHead ) {
					row += "<th>" + key + "</th>";
				} else {
					row += "<td>" + attributes[ key ] + "</td>";
				}
			}
		}

		if ( zoom ) {
			if ( !isHead ) {
				row += addZoomTo( geomap, context.feature );
			} else if ( mapControl ) {
				row += "<th>" + i18nText.zoomFeature + "</th>";
			}
		}

		return row + "</tr>";
	},

	/*
	 * Handle features once they have been added to the map
	 *
	 */
	onFeaturesAdded = function( geomap, table, features, zoom, datatable, mapControl ) {

		var rowObj = {
				type: "head",
				feature: features[ 0 ]
			},
			targetTable = $( "#" + table.attr( "id" ) ),
			targetTableHead = targetTable.find( "thead" ),
			targetTableBody = targetTable.find( "tbody" ),
			selectControl = geomap.selectControl,
			//features = evt.features,
			len = features.length,
			geoRegex = /\W/g,
			headRow = createRow( geomap, rowObj, zoom, mapControl ),
			tableBody = targetTableBody.innerHTML,
			tableClass = datatable ? "wb-tables" : "table-condensed",
			feature, i;

		for( i = 0; i < len || function(){ targetTable.addClass( tableClass ); refreshPlugins( geomap ); return false; }(); i += 1 ){
//		for ( i = 0; i !== len || function() { console.log( "finished.1" ); }(); i += 1 ) {
//		for ( i = 0; i !== len; i += 1 ) {

			feature = features[ i ];
			tableBody += createRow(
					geomap,
					{
						type: "body",
						id: feature.getId(),
						feature: feature,
						selectControl: selectControl
					},
					zoom,
					mapControl
			);

		}

		// Temporary fix for unknown runtime error in IE8
		if ( wb.ielt9 ) {
			$( targetTableHead ).html( headRow );
			$( targetTableBody ).html( tableBody );
		} else {

			//targetTableHead.innerHTML = headRow; // this is not working in IE9
			//targetTableBody.innerHTML += tableBody; // this is not working in IE9
			$( targetTableHead ).html( headRow );
			$( targetTableBody ).html( tableBody );
		}
	},

	/*
	 * Handle overlays once loading has ended
	 *
	 */
	onLoadEnd = function( geomap ) {

		// TODO: fix no alt attribute on tile image in OpenLayers rather than use this override
//		geomap.gmap.find( ".olTileImage" ).attr( "alt", "" );

		// We need to call it here as well because if we use a config outside the domain it is called
		// before the table is created. We need to call it only once loading for all overlays has ended
//		geomap.overlaysLoaded += 1;
//		if ( geomap.overlays === geomap.overlaysLoaded ) {
			refreshPlugins( geomap );
//			geomap.overlays = 0;
//			geomap.overlaysLoaded = 0;
//		}
	},

	/*
	 * Add the checkbox to the column
	 *
	 */
	addChkBox = function( geomap, feature ) {

		return "<td><label class='wb-inv' for='cb_" + feature.getId() + "'>" +
					i18nText.labelSelect + "</label><input type='checkbox' id='cb_" +
					feature.getId() + "' class='geomap-cbx' data-map='" + geomap.mapid +
					"' data-layer='" + feature.layerId + "' data-feature='" +
					feature.getId() + "' /></td>";
	},

	/*
	 * Add the zoom to the column
	 *
	 */
	addZoomTo = function( geomap, feature ) {
		return "<td><a href='javascript:;' data-map='" + geomap.mapid +
			"' data-layer='" + feature.layerId + "' data-feature='" + feature.getId() +
			"' class='btn btn-default btn-sm geomap-zoomto'>" + i18nText.zoomFeature + "</a></td>";
	},

	/*
	 * Add baseMap data
	 */
	addBasemapData = function( geomap, opts ) {
		
		var aspectRatio = 0.8,
			basemap = opts.basemap,
			hasBasemap = basemap && basemap.length !== 0,
			layers = [],
			viewOptions = {},
			urls = [],
			mapOpts = {},
			mapView, params, url, controls, interactions, z,
			projection, resolutions, mapWidth, zoomOffset, offset, matrixIds;
		
		if ( opts.attribution ) {
			mapOpts.attributions = [ new ol.Attribution( {
				html : opts.attribution.text
			} ) ];
		}

		// Check to see if a base map has been configured. If not add the
		// default base map (the Canada Transportation Base Map (CBMT))
		if ( hasBasemap ) {

			aspectRatio = basemap.mapOptions.aspectRatio === undefined ? 0.8 : basemap.mapOptions.aspectRatio;
			geomap.gmap.height( geomap.gmap.width() * aspectRatio );

			// map OL2 params to OL3 view properties
			viewOptions.extent = basemap.mapOptions.maxExtent ? basemap.mapOptions.maxExtent.split( "," ).map( Number ) : null;
			viewOptions.projection = basemap.mapOptions.projection ? basemap.mapOptions.projection : "EPSG:3857";
			viewOptions.center = opts.center ? ol.proj.transform( opts.center, "EPSG:4326", viewOptions.projection ) : basemap.mapOptions.center ? ol.proj.transform( basemap.mapOptions.center, "EPSG:4326", viewOptions.projection ): basemap.mapOptions.maxExtent ? ol.extent.getCenter( viewOptions.extent ) : [ 0, 0 ];
			viewOptions.zoom = opts.zoom ? opts.zoom : basemap.mapOptions.zoomLevel ? basemap.mapOptions.zoomLevel : 2;

			if ( basemap.type === "wms" ) {

				params = removeKeys( basemap, [ "mapOptions", "url" ] );
				params.srs = viewOptions.projection;
				params.crs = viewOptions.projection;

				layers.push(
					new ol.layer.Image( {
						extent: viewOptions.extent,
						source: new ol.source.ImageWMS( { 
							url: basemap.url,
							params: params
						} )
					} )
				);

			} else if ( basemap.type === "esri" ) {

				//backwards compatibility with OL2 configurations
				//TODO: this should only be tried if resource is not found
				mapOpts.url = basemap.url.replace( "/MapServer/export", "/MapServer" );

				layers.push(
					new ol.layer.Tile( {
						extent: viewOptions.extent,
						source: new ol.source.TileArcGISRest( mapOpts )
					} )
				);

			} else if ( basemap.type === "xyz" ) {

				//backwards compatibility with OL2 configurations
				//TODO: test with known configurations
				if ( $.isArray( basemap.url ) ) {
					$.each( basemap.url, function( index, url ) {
						urls.push( url.replace( /\${/g, "{" ) );
					});
					mapOpts.urls = urls;
				} else {
					mapOpts.url = basemap.url.replace( /\${/g, "{" );
				}

				layers.push(
					new ol.layer.Tile( {
						source: new ol.source.XYZ( mapOpts )
					} )
				);

			} else if ( basemap.type === "osm" ) {

				viewOptions.center = opts.center ? ol.proj.transform( opts.center, "EPSG:4326", "EPSG:3857" ) : [ 0, 0 ];
				viewOptions.zoom = opts.zoomLevel ? opts.zoomLevel : 2;

				layers.push( 
					new ol.layer.Tile( {
						source : new ol.source.OSM( { attributions: [ ol.source.OSM.ATTRIBUTION ] } )
					} )
				);

			}

		//no basemap configured so use default
		} else {

			//set default view options
			viewOptions.extent = [ -2750000.0, -900000.0, 3600000.0, 4630000.0 ];
			viewOptions.projection = "EPSG:3978";
			projection = ol.proj.get('EPSG:3978');
			resolutions = [
				38364.660062653464,
				22489.62831258996,
				13229.193125052918,
				7937.5158750317505,
				4630.2175937685215,
				2645.8386250105837,
				1587.5031750063501,
				926.0435187537042,
				529.1677250021168,
				317.50063500127004,
				185.20870375074085,
				111.12522225044451,
				66.1459656252646,
				38.36466006265346,
				22.48962831258996,
				13.229193125052918,
				7.9375158750317505,
				4.6302175937685215
			];
			mapWidth = geomap.gmap.width();
			zoomOffset = 5;
			offset, matrixIds;

			// In function of map width size, set the proper resolution and zoom offset
			if ( mapWidth > 260 && mapWidth <= 500 ) {
				zoomOffset = 1;
			} else if ( mapWidth > 500 && mapWidth <= 725 ) {
				zoomOffset = 2;
			} else if ( mapWidth > 725 && mapWidth <= 1175 ) {
				zoomOffset = 3;
			} else if ( mapWidth > 1175 && mapWidth <= 2300 ) {
				zoomOffset = 4;
			}

			for ( offset = zoomOffset - 1; offset !== -1; offset -= 1 ) {
				resolutions.shift();
			}

			matrixIds = new Array( resolutions.length );

			viewOptions.resolutions = resolutions;

			for ( var z = 0; z < resolutions.length; ++z ) {
			  matrixIds[ z ] = zoomOffset + z;
			}

			layers.push( new ol.layer.Tile( {
				source : new ol.source.WMTS( {
					attributions : [ new ol.Attribution( {
						html : "<a href='" + i18nText.attribLink + "'>\u00A9" + i18nText.attribTitle + "</a>"
					} ) ],
					url : 'http://geoappext.nrcan.gc.ca/arcgis/rest/services/BaseMaps/CBMT_CBCT_GEOM_3978/MapServer/WMTS/',
					layer : i18nText.baseMapTitle,
					matrixSet : 'nativeTileMatrixSet',
					projection : projection,
					tileGrid : new ol.tilegrid.WMTS( {
						origin : [ -3.46558E7, 3.931E7 ],
						resolutions : resolutions,
						matrixIds : matrixIds
					} ),
					style : 'default'
				} )
			} ) );

			// add the text layer
			// TODO get URL from i18n
			layers.push( new ol.layer.Tile( {
				source : new ol.source.WMTS( {
					url : 'http://geoappext.nrcan.gc.ca/arcgis/rest/services/BaseMaps/CBMT_TXT_3978/MapServer/WMTS/',
					layer : i18nText.baseMapTitle,
					matrixSet : 'nativeTileMatrixSet',
					projection : projection,
					tileGrid : new ol.tilegrid.WMTS( {
						origin : [ -3.46558E7, 3.931E7 ],
						resolutions : resolutions,
						matrixIds : matrixIds
					} ),
					style : 'default'
				} )
			} ) );

		}

		//create the map object, but remove null keys from viewOptions first
		mapView = new ol.View( removeNullKeys( viewOptions ) );

		if ( opts.useMapControls ) {
			controls = ol.control.defaults( {
				attributionOptions : /** @type {olx.control.AttributionOptions} */ ( {
				collapsible : false
				} )
			} );

			if ( viewOptions.extent ) {
				controls.push( new ol.control.ZoomToExtent( { 
					extent: viewOptions.extent,
					label: $("<span class='glyphicon glyphicon-fullscreen'></span>")
					} ) );
			}

			interactions = ol.interaction.defaults();
		} else {
			controls = [];
			interactions = [];
		}
		
		var container = document.getElementById('popup'),
			content = document.getElementById('popup-content'),
			closer = document.getElementById('popup-closer');
		
		/**
		 * Create an overlay to anchor the popup to the map.
		 */
		var overlay = new ol.Overlay(/** @type {olx.OverlayOptions} */ ({
		  element: container,
		  autoPan: true,
		  autoPanAnimation: {
		    duration: 250
		  }
		}));

		// create the OpenLayers Map Object
		geomap.map = new ol.Map( {
			controls: controls,
			interactions: interactions,
			logo: false,
			target: geomap.gmap.attr( "id" ),
			layers: layers,
			overlays: [ overlay ],
			view : mapView
		} );

		if ( viewOptions.extent ) {
			mapView.fit( viewOptions.extent, geomap.map.getSize() );
		}

		// Add the popup container
		$( "#" + geomap.gmap.attr( "id" ) ).append(
			"<div id='popup' class='ol-popup'>" +
				"<a href='#' id='popup-closer' class='ol-popup-closer'></a>" +
				"<div id='popup-content'></div>" +
			"</div>" );
		
		 // Add a click handler to the map to render the popup.
		geomap.map.on( "singleclick", function( evt ) {
			var overlay = this.getOverlays().getArray()[0],
				coordinate = evt.coordinate,
				content = document.getElementById('popup-content');
			console.log( content );
			content.innerHTML = "<p>You clicked a feature!</p>";
			overlay.setPosition( coordinate );
		});

		//add the map to the mapArray *DEPRECATED*
		mapArray.push( geomap.map );

	},

	/*
	 * Parse layer configuration keys
	 */
	getLayerKeys = function( obj ) {
		var key, keys = {};
		for ( key in obj ) {
			if ( obj.hasOwnProperty( key ) ) {
				if ( key !== "type" && key !== "caption" && key !== "url" && key !== "title" ) {
					keys[ key ] = obj[ key ];
				}
			}
		}
		return keys;
	},
	
	/*
	 * Remove key
	 */
	removeKeys = function( obj, k) {
		var key, keys = {};
		for ( key in obj ) {
			if ( obj.hasOwnProperty( key ) ) {
				if ( $.inArray( key, k ) < 0 ) {
					keys[ key ] = obj[ key ];
				}
			}
		}
		return keys;
	},
	
	/*
	 * Remove null keys
	 */
	removeNullKeys = function( obj ) {
		var key, keys = {};
		for ( key in obj ) {
			if ( obj.hasOwnProperty( key ) ) {
				if ( obj[ key ] !== null ) {
					keys[ key ] = obj[ key ];
				}
			}
		}
		return keys;
	},

	/*
	 * Add overlay data
	 */
	addOverlayData = function( geomap, opts ) {
		var overlayData = opts.overlays,
			overlayDataLen = overlayData.length;
		if ( overlayDataLen !== 0 ) {
			geomap.overlays = overlayDataLen;
			$.each( overlayData, function( index, layer ) {
				var layerType = layer.type,
					layerTitle = layer.title,
					layerVisible = layer.visible,
					layerURL = layer.url,
					$table = createTable( index, layerTitle, layer.caption, layer.datatable ),
					keys, opacity, olLayer;

				/*
				 * Web Map Service (WMS)
				 */
				if ( layerType === "wms" ) {
					keys = getLayerKeys( layer );
					opacity = keys.options.opacity ? keys.options.opacity : 1;

					olLayer = new ol.layer.Image({
						opacity: opacity,
						source: new ol.source.ImageWMS({
							url: layerURL,
							params: keys
						})
					})

					olLayer.name = "overlay_" + index;
					olLayer.id = "#overlay_" + index;
					olLayer.datatable = false;
					olLayer.popupsInfo = false;
					olLayer.popups = false;
					olLayer.legendUrl = layer.options ? layer.options.legendGraphicUrl : null;
					olLayer.legendHTML = layer.options ? layer.options.legendHTML : null;

					geomap.map.addLayer( olLayer );
					addToLegend( geomap, $table, layerVisible, olLayer.id );
					olLayer.setVisible( layerVisible );

					if ( olLayer.legendUrl ) {
						$( "#sb_" + olLayer.name ).append( "<img src='" + olLayer.legendUrl + "' alt='" + i18nText.geoLgndGrphc + "'/>" );
					} else if ( olLayer.legendHTML ) {
						$( "#sb_" + olLayer.name ).append( olLayer.legendHTML );
					}

				/*
				 * KML
				 */
				} else if ( layerType === "kml" ) {

					var styleFactory = new StyleFactory(),
						colors = defaultColors(),
						layerAttributes = layer.attributes,
						atts, featureGeometry;

					// TODO: this overrides style in KML - please fix
					if ( typeof layer.style === "undefined" ) {
						// TODO: create a defaultStyle object
						layer.style = { "strokeColor" : colors.stroke, "fillColor": colors.fill };
					}

					olLayer = new ol.layer.Vector( { 
						source: new ol.source.Vector( {
							url: layerURL,
							format: new ol.format.KML( {
								extractStyles: !layer.style
							} ),
							strategy: ol.loadingstrategy.bbox
						} )
					} );

					// Set the style
					olLayer.getSource().once( "addfeature", function ( evt ) {
						featureGeometry = evt.feature.getGeometry().getType();
						var style = styleFactory.createStyleFunction( 
								layer.style,
								featureGeometry,
								"#overlay_" + index
						);
						olLayer.setStyle( style );
					}); 

					// As feature is added, set feature id's
//					olLayer.getSource().on( "addfeature", function ( evt ) {
//						evt.feature.setId( generateGuid() );
//						evt.feature.layerId = olLayer.id;
//					});

					// Wait until all features are loaded, then build table and symbolize legend
					olLayer.once( "change", function ( evt ) {

						this.getSource().forEachFeature( function ( feature ) {

							feature.setId( generateGuid() );
							feature.layerId = olLayer.id;
							atts = {};

							//TODO: densify coordinates

							// Parse and store the attributes
							// TODO: test on nested attributes
							for ( name in layerAttributes ) {
								if ( layerAttributes.hasOwnProperty( name ) ) {
									atts[ layerAttributes[ name ] ] = feature.getProperties()[ name ];
								}
							}
							feature.attributes = atts;
						});

						onFeaturesAdded( geomap, $table, this.getSource().getFeatures(), layer.zoom, layer.datatable, opts.useMapControls );
						symbolizeLegend( layer.style, "overlay_" + index, this.getSource().getFeatures()[ 0 ] );
//						onLoadEnd( geomap );
					});

					olLayer.name = "overlay_" + index;
					olLayer.id = "#overlay_" + index;
					olLayer.datatable = layer.datatable;
					olLayer.popupsInfo = layer.popupsInfo;
					olLayer.popups = layer.popups;

					// To force featuresadded listener
//					geomap.queryLayers.push( olLayer );
					geomap.map.addLayer( olLayer );
					addLayerData( geomap, $table, layerVisible, olLayer.id, layer.tab );
					olLayer.setVisible( layerVisible );

//				} else if ( layerType === "atom" ) {
//					olLayer = new ol.Layer.Vector(
//						layerTitle, {
//							strategies: [ new ol.Strategy.Fixed() ],
//							protocol: new ol.Protocol.HTTP( {
//								url: layerURL,
//								format: new ol.Format.Atom( {
//									read: function( data ) {
//										var items = this.getElementsByTagNameNS( data, "*", "entry" ),
//											row, $row, i, len, feature, atts,
//											bnds, ring, geom, geomProj,
//											firstComponent, name, g,
//											features = [],
//											layerAttributes = layer.attributes,
//											projLatLon = new ol.Projection( "EPSG:4326" ),
//											projMap = geomap.map.getProjectionObject();
//
//										for ( i = 0, len = items.length; i !== len; i += 1 ) {
//											row = items[ i ];
//											$row = $( row );
//											g = this.parseFeature( row );
//											feature = new ol.Feature.Vector();
//											firstComponent = g.geometry.components[ 0 ];
//
//											// if we have a bounding box polygon, densify the coordinates
//											if ( g.geometry.CLASS_NAME === "ol.Geometry.Polygon" &&
//												firstComponent.components.length === 5 ) {
//
//												bnds = densifyBBox(
//													firstComponent.components[ 1 ].x,
//													firstComponent.components[ 1 ].y,
//													firstComponent.components[ 3 ].x,
//													firstComponent.components[ 3 ].y
//												);
//
//												ring = new ol.Geometry.LinearRing( bnds );
//												geom = new ol.Geometry.Polygon( ring );
//												geomProj = geom.transform( projLatLon, projMap );
//
//												feature.geometry = geomProj;
//											} else {
//												feature.geometry = this.parseFeature( row ).geometry.transform( projLatLon, projMap );
//											}
//
//											// Parse and store the attributes
//											// TODO: test on nested attributes
//											atts = {};
//											for ( name in layerAttributes ) {
//												if ( layerAttributes.hasOwnProperty( name ) ) {
//													atts[ layerAttributes[ name ] ] = $row.find ( name ).text();
//												}
//											}
//											feature.attributes = atts;
//											features.push( feature );
//										}
//										return features;
//									}
//								} )
//							} ),
//							eventListeners: {
//								featuresadded: function( evt ) {
//									onFeaturesAdded( geomap, $table, evt, layer.zoom, layer.datatable, opts.useMapControls );
//									if ( geomap.overlaysLoading[ layerTitle ] ) {
//										onLoadEnd( geomap );
//									}
//								},
//								loadstart: function() {
//									geomap.overlaysLoading[ layerTitle ] = true;
//									setTimeout( function() {
//										if ( geomap.overlaysLoading[ layerTitle ] ) {
//											onLoadEnd( geomap );
//										}
//									}, overlayTimeout );
//								}
//							},
//							styleMap: getStyleMap( overlayData[ index ] )
//						}
//					);
//					olLayer.name = "overlay_" + index;
//					olLayer.datatable = layer.datatable;
//					olLayer.popupsInfo = layer.popupsInfo;
//					olLayer.popups = layer.popups;
//
//					// to force featuresadded listener
//					olLayer.visibility = true;
//					geomap.queryLayers.push( olLayer );
//					geomap.map.addLayer( olLayer );
//					addLayerData( geomap, $table, layerVisible, olLayer.id, layer.tab );
//					olLayer.visibility = layerVisible;
//				} else if ( layerType === "georss" ) {
//					olLayer = new ol.Layer.Vector(
//						layerTitle, {
//							strategies: [ new ol.Strategy.Fixed() ],
//							protocol: new ol.Protocol.HTTP( {
//								url: layerURL,
//								format: new ol.Format.GeoRSS( {
//									read: function( data ) {
//										var items = this.getElementsByTagNameNS( data, "*", "item" ),
//											row, $row, i, len, bnds, ring,
//											geom, geomProj, feature, atts,
//											firstComponent, name, g,
//											features = [],
//											layerAttributes = layer.attributes,
//											projLatLon = new ol.Projection( "EPSG:4326" ),
//											projMap = geomap.map.getProjectionObject();
//
//										for ( i = 0, len = items.length; i !== len; i += 1 ) {
//											row = items[ i ];
//											$row = $( row );
//											g = this.createFeatureFromItem( row );
//											feature = new ol.Feature.Vector();
//											firstComponent = g.geometry.components[ 0 ];
//
//											// if we have a bounding box polygon, densify the coordinates
//											if ( g.geometry.CLASS_NAME === "ol.Geometry.Polygon" &&
//												firstComponent.components.length === 5 ) {
//
//												bnds = densifyBBox(
//													firstComponent.components[ 1 ].x,
//													firstComponent.components[ 1 ].y,
//													firstComponent.components[ 3 ].x,
//													firstComponent.components[ 3 ].y
//												);
//
//												ring = new ol.Geometry.LinearRing( bnds );
//												geom = new ol.Geometry.Polygon( ring );
//												geomProj = geom.transform( projLatLon, projMap );
//												feature.geometry = geomProj;
//											} else {
//												feature.geometry = this.parseFeature( row ).geometry.transform( projLatLon, projMap );
//											}
//
//											// Parse and store the attributes
//											// TODO: test on nested attributes
//											atts = {};
//											for ( name in layerAttributes ) {
//												if ( layerAttributes.hasOwnProperty( name ) ) {
//													atts[ layerAttributes[ name ] ] = $row.find ( name ).text();
//												}
//											}
//											feature.attributes = atts;
//											features.push( feature );
//										}
//										return features;
//									}
//								} )
//							} ),
//							eventListeners: {
//								featuresadded: function( evt ) {
//									onFeaturesAdded( geomap, $table, evt, layer.zoom, layer.datatable, opts.useMapControls );
//									if ( geomap.overlaysLoading[ layerTitle ] ) {
//										onLoadEnd( geomap );
//									}
//								},
//								loadstart: function() {
//									geomap.overlaysLoading[ layerTitle ] = true;
//									setTimeout( function() {
//										if ( geomap.overlaysLoading[ layerTitle ] ) {
//											onLoadEnd( geomap );
//										}
//									}, overlayTimeout );
//								}
//							},
//							styleMap: getStyleMap( overlayData[ index ] )
//						}
//					);
//					olLayer.name = "overlay_" + index;
//					olLayer.datatable = layer.datatable;
//					olLayer.popupsInfo = layer.popupsInfo;
//					olLayer.popups = layer.popups;
//
//					// To force featuresadded listener
//					olLayer.visibility = true;
//					geomap.queryLayers.push( olLayer );
//					geomap.map.addLayer( olLayer );
//					addLayerData( geomap, $table, layerVisible, olLayer.id, layer.tab );
//					olLayer.visibility = layerVisible;

				} else if ( layerType === "json" ) {

					var styleFactory = new StyleFactory(),
						colors = defaultColors(),
						layerAttributes = layer.attributes,
						olSource = new ol.source.Vector(),
						style;

					if ( typeof layer.style === "undefined" ) {

						// TODO: create a defaultStyle object
						layer.style = { "strokeColor" : colors.stroke, "fillColor": colors.fill };
					}

					olLayer = new ol.layer.Vector( {
						source: olSource
					} );

					// Set the style
					olLayer.getSource().once( "addfeature", function ( evt ) {
						featureGeometry = evt.feature.getGeometry().getType();
						style = styleFactory.createStyleFunction( 
							layer.style,
							featureGeometry,
							"#overlay_" + index
						);
						olLayer.setStyle( style );
					}); 

					function successHandler( data ) {

						var layerRoot = layer.root,
							items = data[ layerRoot ] ? data[ layerRoot ] : data,
							//transform = ol.proj.getTransform( "EPSG:4326", geomap.map.getView().getProjection() ),
							atts, bnds, feature, firstComponent, geom, geomProj, geomKey;

						$.each( items, function( index, item ) {

							if ( !geomKey ) {
								$.each( item, function( k, v ) {
									if ( v.coordinates ) {
										geomKey = k;
									}
								});
							}

							if ( !item[ geomKey ] ) { return; }

							firstComponent = item[ geomKey ].coordinates[ 0 ];

							// if we have a bounding box polygon, densify the coordinates
							if ( item[ geomKey ].type === "Polygon" &&
								firstComponent.length === 5 ) {

								bnds = densifyBBox(
									firstComponent[ 1 ][ 0 ],
									firstComponent[ 1 ][ 1 ],
									firstComponent[ 3 ][ 0 ],
									firstComponent[ 3 ][ 1 ]
								);

								var coordinates = [];
								bnds.forEach(function( point ) {
									coordinates.push( point.getCoordinates() );
								});

								geom = new ol.geom.Polygon( [ coordinates ] );

							} else if ( item[ geomKey ].type === "Point" ) {

								geom = new ol.geom.Point( [ item[ geomKey ].coordinates[ 1 ], item[ geomKey ].coordinates[ 0 ] ] );

							} else {

//								feature.geometry = this.parseGeometry( row.geometry );

							}

							// transform the feature
							// TODO: support GeoJSON projections via OGC CRS URNs such as:
							//		"urn:ogc:def:crs:OGC:1.3:CRS84" 
							geomProj = geom.transform( "EPSG:4326", geomap.map.getView().getProjection() );

							// Parse and store the attributes
							// TODO: test on nested attributes
							atts = {};

							for ( name in layerAttributes ) {
								var path;
								if ( layerAttributes.hasOwnProperty( name ) ) {
									path = layerAttributes[ name ].path;
									if ( path ) {
										atts[ layerAttributes[ name ] ] = item[ name ][ path ];
									} else {
										atts[ layerAttributes[ name ] ] = item[ name ];
									}
								}
							}

							feature = new ol.Feature();
							feature.setId( generateGuid() );
							feature.layerId = olLayer.id;
							feature.attributes = atts;
							feature.setGeometry( geomProj );
							olSource.addFeature( feature );

						});

						onFeaturesAdded( geomap, $table, olSource.getFeatures(), layer.zoom, layer.datatable, opts.useMapControls );
						symbolizeLegend( layer.style, "overlay_" + index, olSource.getFeatures()[ 0 ] );
					}

					// Get the file
					$.ajax( {
						url: layerURL,
						dataType: 'json',
						data: layer.params,
						success: successHandler
					} );

					olLayer.name = "overlay_" + index;
					olLayer.id = "#overlay_" + index;
					olLayer.datatable = layer.datatable;
					olLayer.popupsInfo = layer.popupsInfo;
					olLayer.popups = layer.popups;

					// geomap.queryLayers.push( olLayer );
					geomap.map.addLayer( olLayer );
					addLayerData( geomap, $table, layerVisible, olLayer.id, layer.tab );
					olLayer.setVisible( layerVisible );

				} else if ( layerType === "geojson" ) {

					var styleFactory = new StyleFactory(),
						colors = defaultColors(),
						layerAttributes = layer.attributes,
						atts, featureGeometry;

					layerURL = layer.params ? layerURL + "?" + $.param( layer.params ) : layerURL;

					olLayer = new ol.layer.Vector( { 
						source: new ol.source.Vector( {
							url: layerURL,
							format: new ol.format.GeoJSON(),
							strategy: ol.loadingstrategy.bbox
						} )
					} );

					// Set the style
					olLayer.getSource().once( "addfeature", function ( evt ) {
						featureGeometry = evt.feature.getGeometry().getType();
						var style = styleFactory.createStyleFunction( 
								layer.style,
								featureGeometry,
								"#overlay_" + index
						);
						olLayer.setStyle( style );
					}); 

					//Wait until all features are loaded, then build table and symbolize legend
					olLayer.once( "change", function ( evt ) {
						this.getSource().forEachFeature( function ( feature ) {

							feature.setId( generateGuid() );
							feature.layerId = olLayer.id;
							atts = {};

							//TODO: densify coordinates

							// Parse and store the attributes
							// TODO: test on nested attributes
							for ( name in layerAttributes ) {
								if ( layerAttributes.hasOwnProperty( name ) ) {
									atts[ layerAttributes[ name ] ] = feature.getProperties()[ name ];
								}
							}
							feature.attributes = atts;
						});

						onFeaturesAdded( geomap, $table, this.getSource().getFeatures(), layer.zoom, layer.datatable, opts.useMapControls );
						symbolizeLegend( layer.style, "overlay_" + index, this.getSource().getFeatures()[ 0 ] );

					});

					olLayer.name = "overlay_" + index;
					olLayer.id = "#overlay_" + index;
					olLayer.datatable = layer.datatable;
					olLayer.popupsInfo = layer.popupsInfo;
					olLayer.popups = layer.popups;

					//geomap.queryLayers.push( olLayer );
					geomap.map.addLayer( olLayer );
					addLayerData( geomap, $table, layerVisible, olLayer.id, layer.tab );
					olLayer.setVisible( layerVisible );

				}
			} );

		}
	},

	/*
	* Add tabluar data
	*
	* Sample tables object:
	*
	* tables: [
	*   { id: 'cityE', strokeColor: '#F00', fillcolor: '#F00' }
	* ]
	*/
	addTabularData = function( geomap, opts, projLatLon, projMap ) {
		var $alert, $parent, $table, table, featureTable, featureArray, attr, theadTr, olLayer,thElms, thLen,
			trElms, trLen, useMapControls, attrMap, trElmsInd, geomType,
			feat, feature, features, featureType, vectorFeature, wktFeature,
			script, bbox, vertices, len, vertLen, lenTable,
			thZoom = "<th>" + i18nText.zoomFeature + "</th>",
			thSelect = "<th>" + i18nText.select + "</th>",
			wktParser = new ol.format.WKT(),
			thRegex = /<\/?[^>]+>/gi,
			vectRegex = /\W/g,
			visibility,
			styleFactory, colors;

		for ( lenTable = opts.tables.length - 1; lenTable !== -1; lenTable -= 1 ) {
			table = document.getElementById( opts.tables[ lenTable ].id );

			// if the table is not found continue
			if ( !table ) {
				continue;
			}

			$table = $( table );
			$table.wrap( "<div class='wb-geomap-table-wrapper'></div>" );
			$parent = $table.parents( ".wb-geomap-table-wrapper" );
			featureTable = opts.tables[ lenTable ];
			featureArray = [];
			attr = [];
			thElms = table.getElementsByTagName( "th" );
			trElms = table.getElementsByTagName( "tr" );
			trLen = trElms.length;
			useMapControls = opts.useMapControls;

			// if visibility is not set to false, show the layer
			visibility = opts.tables[ lenTable ].visible === false ? false : true;

			// Get the attributes from table header
			for ( thLen = thElms.length - 1; thLen !== -1; thLen -= 1 ) {
				attr[ thLen ] = thElms[ thLen ].innerHTML.replace( thRegex, "" );
			}

			// If zoomTo add the header column headers
			theadTr = $table.find( "thead tr" );
			if ( featureTable.zoom && useMapControls ) {
				theadTr.append( thZoom );
			}

			// Add select checkbox
			theadTr.prepend( thSelect );

			// Loop through each row
			for ( trLen = trElms.length - 1; trLen !== -1; trLen -= 1 ) {

				// Create an array of attributes: value
				attrMap = {};
				
				
				trElmsInd = trElms[ trLen ];

				// Get the geometry type
				geomType = trElmsInd.getAttribute( "data-type" );
				features = trElmsInd.getElementsByTagName( "td" );

				for ( len = features.length - 1; len !== -1; len -= 1 ) {

					// Use innerHTML instead of innerText or textContent because they react differently in different browser
					// remove script tag from the attribute
					feature = features[ len ];
					script = feature.getElementsByTagName( "script" )[ 0 ];
					if ( script ) {
						script.parentNode.removeChild( script );
					}
					attrMap[ attr[ len ] ] = feature.innerHTML;
				}

				if ( geomType !== null ) {
					if ( geomType === "bbox" ) {
						bbox = trElmsInd.getAttribute( "data-geometry" ).split( "," );

						feat = densifyBBox(
							bbox[ 0 ],
							bbox[ 1 ],
							bbox[ 2 ],
							bbox[ 3 ]
						);

						vertices = "";

						for ( vertLen = feat.length - 1; vertLen !== -1; vertLen -= 1 ) {
							vertices += feat[ vertLen ].getCoordinates()[0] + " " + feat[ vertLen ].getCoordinates()[1] + ", ";
						}

						vertices = vertices.slice( 0, -2 );
						wktFeature = "POLYGON ((" + vertices + "))";

					} else if ( geomType === "wkt" ) {
						wktFeature = trElmsInd.getAttribute( "data-geometry" );
					}

					vectorFeature = wktParser.readFeature( wktFeature, {
						dataProjection: "EPSG:4326",
						featureProjection: geomap.map.getView().getProjection()
					} );

					vectorFeature.setId( generateGuid() );
					vectorFeature.layerId = "#" + featureTable.id;

					// Set the table row id
					trElmsInd.setAttribute( "id", vectorFeature.getId().replace( vectRegex, "_" ) );

					// Add the checkboxes and zoom controls
					$( trElmsInd ).html( addChkBox( geomap, vectorFeature ) + trElmsInd.innerHTML +
					( useMapControls && featureTable.zoom ? addZoomTo( geomap, vectorFeature ) : "" ) );

					// Add the attributes to the feature then add it to the feature array
					vectorFeature.attributes = attrMap;
					featureArray.push( vectorFeature );

				}
			}

			styleFactory = new StyleFactory();
			colors = defaultColors();

			if ( typeof featureTable.style === "undefined" ) {
				// TODO: create a defaultStyle object
				featureTable.style = { "strokeColor" : colors.stroke, "fillColor": colors.fill };
			}

			// create a new layer with the feature array
			olLayer = new ol.layer.Vector( {
				source: new ol.source.Vector( {
					features: featureArray
				} ),
				style: styleFactory.createStyleFunction( featureTable.style, vectorFeature.getGeometry().getType(), featureTable.id )
			} );

			olLayer.id = "#" + featureTable.id;
			olLayer.datatable = featureTable.datatable;
			olLayer.popupsInfo = featureTable.popupsInfo;
			olLayer.popups = featureTable.popups;
			olLayer.name = featureTable.id;
			geomap.map.addLayer( olLayer );
			geomap.queryLayers.push( olLayer );
			olLayer.setVisible( visibility );

			if ( featureTable.tab ) {
				addLayerData( geomap, $table, visibility, olLayer.id, featureTable.tab );
			} else if ( geomap.glegend.length > 0 ) {

				// create a legend
				addToLegend( geomap, $table, visibility, olLayer.id );

				// create the legend symbols
				// TODO: consider moving to style factory or addToLegend
				// so that defaultStyle can be created there
				symbolizeLegend( featureTable.style, featureTable.id, featureArray[0] );

			}

			$alert = $( "#msg_" + featureTable.id );

			if ( $alert.length === 0 ) {
				$parent.after( "<div id='msg_" + featureTable.id + "'><p>" +
									i18nText.hiddenLayer + "</p></div>" );
			}

			visibility ? $( "#msg_" + featureTable.id ).fadeOut() : $( "#msg_" + featureTable.id ).fadeIn();
			visibility ? $parent.fadeIn() : $parent.fadeOut();

		}
	},

	/*
	 * Load controls
	 */
	loadControls = function( geomap, opts ) {
		var $mapDiv = geomap.gmap,
			map = geomap.map,
			i18nMousePosition = i18nText.mouseposition,
			i18nScaleLine = i18nText.scaleline,
			useMapControls = opts.useMapControls,
			tables = opts.tables,
			tablesLen = tables.length,
			layers = geomap.queryLayers,
			layersLen = layers.length,
			mouseCtrl, scaleCtrl, selectControl,
			table, tableId, layer, features, featuresLen,
			zoom, i, j, k, cntr, zm;

		// TODO: Ensure WCAG compliance before enabling
		selectControl = new ol.interaction.Select( {
			layers: layers
		} );
		
		ol.interaction.defaults( { mouseWheelZoom: false } ),

		map.getInteractions().extend( [ selectControl ] );
		

		selectControl.on( "select", function ( evt ) {
			
//			if(evt.selected.length > 0){
//				console.log( "selected feature id: " + evt.selected[ 0 ].getId() );
//			}

			if ( evt.selected.length > 0 ) {
				onFeatureSelect( evt.selected[ 0 ] );
			}

			if ( evt.deselected.length > 0 ) {
				onFeatureUnselect( evt.deselected[ 0 ] );
			}
		});

		if ( useMapControls ) {

//			// Add interactions
//			map.getInteractions().extend( [ 
//				new ol.interaction.DoubleClickZoom(),
//				new ol.interaction.DragBox(),
//				new ol.interaction.DragPan(),
//				new ol.interaction.KeyboardPan(),
//				new ol.interaction.KeyboardZoom(),
//				new ol.interaction.MouseWheelZoom(),
//				new ol.interaction.PinchZoom()
//			] );

			if ( opts.useMousePosition ) {
				mouseCtrl = new ol.control.MousePosition({
					coordinateFormat : ol.coordinate.createStringXY( 4 ),
					projection : 'EPSG:4326',
					// comment the following two lines to have the mouse
					// position be placed within the map.
					// className: 'custom-mouse-position',
					// target: document.getElementById('mouse-position'),
					undefinedHTML : ""
				});
				map.addControl( mouseCtrl );
				mouseCtrl.element.setAttribute( "aria-label", i18nMousePosition );
				mouseCtrl.element.setAttribute( "title", i18nMousePosition );
			}

			if ( opts.useScaleLine ) {
				scaleCtrl =  new ol.control.ScaleLine();
				map.addControl( scaleCtrl );
				scaleCtrl.element.setAttribute( "aria-label", i18nScaleLine );
				scaleCtrl.element.setAttribute( "title", i18nScaleLine );
			}

			//map.addControl( new ol.Control.Navigation( { zoomWheelEnabled: true } ) );
			//map.addControl( new ol.control.KeyboardDefaults( { autoActivate: false } ) );

			// Add the map div to the tabbing order
			$mapDiv.attr( {
				tabindex: "0",
				"data-map": geomap.mapid
			} );

			// Add pan zoom
			addPanZoom( geomap );

			$mapDiv.before(
				"<details id='geomap-details-" + geomap.mapid +
				"' class='wb-geomap-detail' style='width:" +
				( $mapDiv.width() - 10 ) + "px;'><summary>" +
				i18nText.accessTitle + "</summary><p>" + i18nText.access +
				"</p></details>"
			);
		}

	},

	// Construct a polygon and densify the latitudes to show the curvature
	densifyBBox = function( minX, minY, maxX, maxY ) {

		var left = parseFloat( minX ),
			bottom = parseFloat( minY ),
			right = parseFloat( maxX ),
			top = parseFloat( maxY ),
			newbounds = [ ],
			j;

		if ( left.length === 0 || bottom.length === 0 ||
			right.length === 0 || top.length === 0 ) {

			return false;
		}

		// If default BBOX, make it fit in view showing Canada and not the world.
		if ( left === -180.0 ) {
			left += 0.1;
		}
		if ( right === 180.0 ) {
			right = -5.0;
		}
		if ( top === 90.0 ) {
			top -= 3;
		}
		if ( bottom === -90.0 ) {
			bottom = 35.0;
		}

		for ( j = left; j < right; j += 0.5 ) {
			newbounds.push( new ol.geom.Point( [ j, bottom ] ) );
		}

		newbounds.push( new ol.geom.Point( [ right, bottom ] ) );

		for ( j = right; j > left; j -= 0.5 ) {
			newbounds.push( new ol.geom.Point( [ j, top ] ) );
		}

		newbounds.push( new ol.geom.Point( [ left, top ] ) );
		newbounds.push( new ol.geom.Point( [ left, bottom ] ) );

		return newbounds;
	},

	/*
	 * Create the map after we load the config file.
	 */
	createMap = function( geomap, opts ) {

		// Add basemap data
		addBasemapData( geomap, opts );

		// Add geocoder and AOI layer
//		geomap.locStyle = new ol.style.Style( { pointRadius: 10, strokeColor: "#ff0000", fillColor: "#333333" } );

		var vector = new ol.layer.Vector({
			source: new ol.source.Vector(),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: "rgba( 255, 0, 20, 0.1 )"
				}),
				stroke: new ol.style.Stroke( {
					color: '#ff0033',
					width: 2
				} ),
				image: new ol.style.RegularShape({
					fill: new ol.style.Fill({
						color: '#ff0033'
					}),
					stroke: new ol.style.Stroke({
						color: '#ff0033',
						width: 5
					}),
					points: 4,
					radius: 10,
					radius2: 0,
					angle: 0
				})
			})
		});

		geomap.locLayer = vector;

		geomap.map.addLayer( vector );

		// Create projection objects
		var projLatLon = new ol.proj.Projection( { code: "EPSG:4326" } ),
			projMap = geomap.map.getView().getProjection();

		// Add layer holder
		createLayerHolder( geomap, opts.useTab );

		// Add tabular data
		addTabularData( geomap, opts, projLatLon, projMap );

		// Add overlay data
		addOverlayData( geomap, opts );

		// Load Controls
		loadControls( geomap, opts );

		// Add the geocoder widget
		if ( opts.useGeocoder ) {
			createGeocoderWidget( geomap );
		}

		// Add the AOI widget
		if ( opts.useAOI ) {
			createAOIWidget( geomap );
		}

		// Add the geolocation widget
		if ( opts.useGeolocation ) {
			createGeolocationWidget( geomap );
		}

		// Add WCAG element for the map div
		geomap.gmap.attr( {
			role: "dialog",
			"aria-label": i18nText.ariaMap
		} );

//		//use ol events
//		geomap.map.getViewport().addEventListener( "mouseover", function( evt) {
//			setMapStatus( this, evt );
//		}, false );
//		geomap.map.getViewport().addEventListener( "mouseout", function( evt) {
//			setMapStatus( this, evt );
//		}, false );

		//use jquery events
//		$( geomap.map.getViewport() ).on( "mouseover mouseout", function( evt ) {
//			setMapStatus( geomap.map, evt );
//		});

		geomap.map.on( "moveend", function( evt ) {
			$( geomap.mapid ).trigger( "wb-updated" + selector, [ geomap.map ] );
		} );

		geomap.map.once( "postrender", function(){

//			refreshPlugins( geomap );

			// Identify that initialization has completed
			wb.ready( $( "#" + geomap.mapid ), componentName, [ geomap.map ] );

		} );

		// Set map id to be able to access by getMap.
		geomap.map.id = geomap.mapid;

		// Add map to map array
		mapArray.push( geomap.map );

		$document.on( "wb-ready.wb-geomap", "#" + geomap.mapid, function() {

			// Remove the loader
			$( "#" + geomap.mapid ).find( ".geomap-progress" ).remove();

		} );
		
		geomap.map.on( "moveend", function( evt ) {

			// Every time we zoom/pan we need to put back the alt for OpenLayers tiles
			// TODO check if .olTileImage class is still valid
//			$( ".olTileImage" ).attr( "alt", "" );

			$( geomap.mapid ).trigger( "wb-updated" + selector, [ geomap.map ] );

			// Force redraw of WMS overlays
//			for ( lyrLen = lyrs.getLength() - 1; lyrLen !== -1; lyrLen -= 1 ) {
//				lyr = lyrs[ lyrLen ];
//				if ( lyr instanceof ol.source.TileWMS || lyr instanceof ol.source.ImageWMS ) {
//					lyr.redraw( true );
//				}
//			}
		} );

	},

	// Enable the keyboard navigation when map div has focus. Disable when blur
	// Enable the wheel zoom only on hover
	setMapStatus = function( map, event ) {

		var type = event.type,
			target = event.currentTarget.className.indexOf( "wb-geomap-map" ) === -1 ?
					event.currentTarget.parentElement : event.currentTarget,
			isActive, interaction;

//		interaction = getMapInteraction( map, ol.interaction.MouseWheelZoom );

//		if ( element ) {
			isActive = target.className.indexOf( "active" );
			if ( type === "mouseover" || type === "focusin" ) {
				if ( isActive ) {
//					if( interaction ) {
//						interaction.set( "active", true );
//					}
					$( target ).addClass( "active" );
				}
			} else if ( isActive > 0 ) {
//				if( interaction ) {
//					interaction.set( "active", false );
//				}
				$( target ).removeClass( "active" );
			}
//		}
	},

	/*
	 * Get the OpenLayers map object
	 */
	getMap = function() {
		var mapArrayItem,
			map = {},
			len;

		for ( len = mapArray.length - 1; len !== -1; len -= 1 ) {
			mapArrayItem = mapArray[ len ];
			map[ mapArrayItem.id ] = mapArrayItem;
		}

		return map;
	},

	getMapById = function( mapId ) {
		var mapArrayItem, len;
		for ( len = mapArray.length - 1; len !== -1; len -= 1 ) {
			mapArrayItem = mapArray[ len ];
			if ( mapArrayItem.id === mapId ) {
				return mapArrayItem;
			}
		}
		return;
	},

	createAOIWidget = function( geomap ) { return;

		geomap.drawControl = new ol.Control.DrawFeature(
			geomap.locLayer,
			ol.Handler.RegularPolygon, {
				handlerOptions: {
					sides: 4,
					irregular: true
				},
				eventListeners: {
					featureadded: function( e ) {
						var projLatLon = new ol.Projection( "EPSG:4326" ),
							projMap = geomap.map.getProjectionObject(),
							bnds = e.feature.geometry.getBounds(),
							bndsLL = bnds.transform( projMap, projLatLon );

						$( "#geomap-aoi-extent-" + geomap.mapid ).val( bnds.toString() );
						$( "#geomap-aoi-extent-lonlat-" + geomap.mapid ).val( bndsLL.toString() );
						$( "#geomap-aoi-minx-" + geomap.mapid ).val( bndsLL.toArray()[ 0 ].toFixed( 6 ) );
						$( "#geomap-aoi-miny-" + geomap.mapid ).val( bndsLL.toArray()[ 1 ].toFixed( 6 ) );
						$( "#geomap-aoi-maxx-" + geomap.mapid ).val( bndsLL.toArray()[ 2 ].toFixed( 6 ) );
						$( "#geomap-aoi-maxy-" + geomap.mapid ).val( bndsLL.toArray()[ 3 ].toFixed( 6 ) );

						$( "#geomap-aoi-btn-draw-" + geomap.mapid ).click();
					}
				}
			}
		);

		geomap.map.addControl( geomap.drawControl );

		geomap.gmap.before( "<div class='geomap-aoi panel panel-default'><div id='geomap-aoi-" + geomap.mapid + "' class='panel-body'></div></div>" );

		var mapDiv = $( "#geomap-map-" + geomap.mapid ),
			aoiDiv = $( "#geomap-aoi-" + geomap.mapid ),
			extent,
			left,
			bottom,
			right,
			top,
			geomProj;

		aoiDiv.append( "<fieldset id='form-aoi-" + geomap.mapid + "'>" +
				"<legend tabindex='-1'>" + i18nText.aoiInstructions + "</legend>" +
				"<div class='row'>" +
					"<div class='col-md-2'>" +
						"<label for='geomap-aoi-maxy-" + geomap.mapid + "' class='wb-inv'>" + i18nText.aoiNorth + "</label>" +
						"<div class='input-group input-group-sm'>" +
							"<span class='input-group-addon'>" + i18nText.aoiNorth.charAt( 0 ) + "</span>" +
							"<input type='number' id='geomap-aoi-maxy-" + geomap.mapid + "' placeholder='90' class='form-control input-sm' min='-90' max='90' step='0.000001'></input>" +
						"</div>" +
					"</div>" +
					"<div class='col-md-2'>" +
						"<label for='geomap-aoi-maxx-" + geomap.mapid + "' class='wb-inv'>" + i18nText.aoiEast + "</label>" +
						"<div class='input-group input-group-sm'>" +
							"<span class='input-group-addon'>" + i18nText.aoiEast.charAt( 0 ) + "</span>" +
							"<input type='number' id='geomap-aoi-maxx-" + geomap.mapid + "' placeholder='180' class='form-control input-sm' min='-180' max='180' step='0.000001'></input> " +
						"</div>" +
					"</div>" +
					"<div class='col-md-2'>" +
						"<label for='geomap-aoi-miny-" + geomap.mapid + "' class='wb-inv'>" + i18nText.aoiSouth + "</label>" +
						"<div class='input-group input-group-sm'>" +
							"<span class='input-group-addon'>" + i18nText.aoiSouth.charAt( 0 ) + "</span>" +
							"<input type='number' id='geomap-aoi-miny-" + geomap.mapid + "' placeholder='-90' class='form-control input-sm' min='-90' max='90' step='0.000001'></input> " +
						"</div>" +
					"</div>" +
					"<div class='col-md-2'>" +
						"<label for='geomap-aoi-minx-" + geomap.mapid + "' class='wb-inv'>" + i18nText.aoiWest + "</label>" +
						"<div class='input-group input-group-sm'>" +
							"<span class='input-group-addon'>" + i18nText.aoiWest.charAt( 0 ) + "</span>" +
							"<input type='number' id='geomap-aoi-minx-" + geomap.mapid + "' placeholder='-180' class='form-control input-sm' min='-180' max='180' step='0.000001'></input> " +
						"</div>" +
					"</div>" +
					"<div class='col-md-4'>" +
						"<button class='btn btn-default btn-sm' id='geomap-aoi-btn-draw-" + geomap.mapid + "'>" + i18nText.add + "</button> " +
						"<button class='btn btn-default btn-sm' id='geomap-aoi-btn-clear-" + geomap.mapid + "'>" + i18nText.aoiBtnClear + "</button> " +
					"</div>" +
				"</div>" +
				"<input type='hidden' id='geomap-aoi-extent-" + geomap.mapid + "'></input>" +
				"<input type='hidden' id='geomap-aoi-extent-lonlat-" + geomap.mapid + "'></input>" +
			"</fieldset>" +
		"</div>" +
		"<div class='clear'></div>" );

		if ( geomap.aoiToggle ) {
			aoiDiv.parent().hide();
			mapDiv.append( "<button id='geomap-aoi-toggle-mode-draw-" + geomap.mapid +
					"' href='#' class='btn btn-sm geomap-geoloc-aoi-btn' title='" + i18nText.aoiBtnDraw +
					"'><i class='glyphicon glyphicon-edit'></i><span class='wb-inv'> " +
					i18nText.aoiBtnDraw + "</span></button>" );
		} else {
			$( "#geomap-aoi-btn-clear-" + geomap.mapid ).after( "<button id='geomap-aoi-toggle-mode-draw-" + geomap.mapid +
					"' href='#' class='btn btn-sm geomap-geoloc-aoi-btn' title='" + i18nText.aoiBtnDraw +
					"'><i class='glyphicon glyphicon-edit'></i> " +
					i18nText.aoiBtnDraw + "</button>" );
		}

		$document.on( "click", "#geomap-aoi-toggle-mode-draw-" + geomap.mapid, function( evt ) {

			evt.preventDefault();

			var drawFeature = geomap.map.getControlsByClass( "ol.Control.DrawFeature" )[ 0 ],
				active = drawFeature.active,
				$aoiElm = $( "#geomap-aoi-" + geomap.mapid );

			if ( geomap.aoiToggle ) {
				$aoiElm.parent().slideToggle( function() {

					// fixes issue #6148
					geomap.map.events.element.offsets = null;
					geomap.map.events.clearMouseCache(); /* for v2.7 */
				} );
			}

			$( this ).toggleClass( "active" );

			if ( !active ) {
				$aoiElm.find( "legend" ).trigger( "setfocus.wb" );
			}

			if ( active ) {
				drawFeature.deactivate();
			} else {
				drawFeature.activate();
			}

		} );

		$document.on( "click", "#geomap-aoi-btn-clear-" + geomap.mapid, function( evt ) {
			evt.preventDefault();
			$( "#geomap-aoi-extent-" + geomap.mapid ).val( "" );
			$( "#geomap-aoi-extent-lonlat-" + geomap.mapid ).val( "" );
			$( "#geomap-aoi-minx-" + geomap.mapid ).val( "" ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-miny-" + geomap.mapid ).val( "" ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-maxx-" + geomap.mapid ).val( "" ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-maxy-" + geomap.mapid ).val( "" ).parent().removeClass( "has-error" );

			geomap.locLayer.removeAllFeatures();
		} );

		$document.on( "click", "#geomap-aoi-btn-draw-" + geomap.mapid, function( evt ) {

			evt.preventDefault();

			$( "#geomap-aoi-extent-" + geomap.mapid ).val( "" );
			$( "#geomap-aoi-extent-lonlat-" + geomap.mapid ).val( "" );
			$( "#geomap-aoi-minx-" + geomap.mapid ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-maxx-" + geomap.mapid ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-maxy-" + geomap.mapid ).parent().removeClass( "has-error" );
			$( "#geomap-aoi-miny-" + geomap.mapid ).parent().removeClass( "has-error" );

			geomap.locLayer.removeAllFeatures();

			var left = parseFloat( $( "#geomap-aoi-minx-" + geomap.mapid ).val() ),
				bottom = parseFloat( $( "#geomap-aoi-miny-" + geomap.mapid ).val() ),
				right = parseFloat( $( "#geomap-aoi-maxx-" + geomap.mapid ).val() ),
				top = parseFloat( $( "#geomap-aoi-maxy-" + geomap.mapid ).val() ),
				isValid = true,
				geomProj,
				extent;

			if ( !left || left < -180 || left > 180 ) {
				$( "#geomap-aoi-minx-" + geomap.mapid ).parent().addClass( "has-error" );
				isValid = false;
			}

			if ( !right || right < -180 || right > 180 ) {
				$( "#geomap-aoi-maxx-" + geomap.mapid ).parent().addClass( "has-error" );
				isValid = false;
			}

			if ( !top || top < -90 || top > 90 ) {
				$( "#geomap-aoi-maxy-" + geomap.mapid ).parent().addClass( "has-error" );
				isValid = false;
			}

			if ( !bottom || bottom < -90 || bottom > 90 ) {
				$( "#geomap-aoi-miny-" + geomap.mapid ).parent().addClass( "has-error" );
				isValid = false;
			}

			if ( isValid === false ) {
				return false;
			}

			extent = { "minx": left, "miny": bottom, "maxx": right, "maxy": top };

			geomProj = drawAOI( geomap, extent );

			geomap.map.zoomToExtent( geomap.locLayer.getDataExtent() );

			$( "#geomap-aoi-extent-" + geomap.mapid ).val( geomProj.getBounds().toBBOX() ).trigger( "change" );
			$( "#geomap-aoi-extent-lonlat-" + geomap.mapid ).val( left + ", " + bottom + ", " + right + ", " + top ).trigger( "change" );

		} );

		// if a default AOI is provided add it to the map and zoom to it
		if ( geomap.aoiExtent ) {

			extent = geomap.aoiExtent.split( "," );
			left = extent[ 0 ].trim();
			bottom = extent[ 1 ].trim();
			right = extent[ 2 ].trim();
			top = extent[ 3 ].trim();
			geomProj = drawAOI( geomap, {
				"minx": left,
				"miny": bottom,
				"maxx": right,
				"maxy": top
			} );

			geomap.map.zoomToExtent( geomap.locLayer.getDataExtent() );

			$( "#geomap-aoi-minx-" + geomap.mapid ).val( left );
			$( "#geomap-aoi-maxx-" + geomap.mapid ).val( right );
			$( "#geomap-aoi-maxy-" + geomap.mapid ).val( top );
			$( "#geomap-aoi-miny-" + geomap.mapid ).val( bottom );
			$( "#geomap-aoi-extent-" + geomap.mapid ).val( geomProj.getBounds().toBBOX() );
			$( "#geomap-aoi-extent-lonlat-" + geomap.mapid ).val( left + ", " + bottom + ", " + right + ", " + top );

		}
	},

	drawAOI = function( geomap, extent ) {
		var bnds,
			ring,
			geom,
			projLatLon,
			projMap,
			geomProj,
			feat;

		bnds = densifyBBox( extent.minx, extent.miny, extent.maxx, extent.maxy );
		ring = new ol.Geometry.LinearRing( bnds );
		geom = new ol.Geometry.Polygon( ring );
		projLatLon = new ol.Projection( "EPSG:4326" );
		projMap = geomap.map.getProjectionObject();
		geomProj = geom.transform( projLatLon, projMap );
		feat = new ol.Feature.Vector( geomProj );

		geomap.locLayer.addFeatures( [ feat ] );

		// return the projected geometry
		return geomProj;

	},

	createGeocoderWidget = function( geomap ) {

		var mapDiv = $( "#geomap-map-" + geomap.mapid ),
			xhr,
			timer;

		mapDiv.append(
			"<div class='geomap-geoloc'>" +
				"<label for='wb-geomap-geocode-search-" + geomap.mapid + "' class='wb-inv'>" + i18nText.geoCoderLabel + "</label>" +
				"<input type='text' class='form-control input-sm opct-90' name='wb-geomap-geocode-search-" + geomap.mapid + "' id='wb-geomap-geocode-search-" + geomap.mapid + "' list='wb-geomap-geocode-results-" + geomap.mapid + "' autocomplete='off' placeholder='" + i18nText.geoCoderPlaceholder + "' />" +
				"<datalist id='wb-geomap-geocode-results-" + geomap.mapid + "'></datalist>" +
			"</div>"
		);

		$( "#wb-geomap-geocode-search-" + geomap.mapid ).trigger( "wb-init.wb-datalist" );

		$document.on( "keypress", "#wb-geomap-geocode-search-" + geomap.mapid, function( evt ) {

			if ( evt.keyCode !== 13 ) {
				return;
			}

			var bbox,
				bnds,
				coords = [],
				dens,
				feat,
				len,
				ll,
				projLatLon = new ol.proj.Projection( { code: "EPSG:4326" } ),
				projMap = geomap.map.getView().getProjection(),
				val,
				zoom;

			geomap.locLayer.getSource().clear( true );

			val = $( "#wb-geomap-geocode-search-" + geomap.mapid ).val();

			if ( !val ) {
				$( "#wb-geomap-geocode-search-" + geomap.mapid ).parent().addClass( "has-error" );
				setTimeout(	function() {
					$( "#wb-geomap-geocode-search-" + geomap.mapid ).parent().removeClass( "has-error" );
				}, 5000 );
				return;
			}

			bbox = $( "#wb-geomap-geocode-results-" + geomap.mapid + " option" ).filter( function() {
				return this.value === val;
			} ).data( "bbox" );

			ll = $( "#wb-geomap-geocode-results-" + geomap.mapid + " option" ).filter( function() {
				return this.value === val;
			} ).data( "lat-lon" );

			if ( bbox != null ) {

				bnds = bbox.split(","); // TODO loop and parseFloat() on coords
				dens = densifyBBox( parseFloat( bnds[ 0 ] ), parseFloat( bnds[ 1 ] ), parseFloat( bnds[ 2 ] ), parseFloat( bnds[ 3 ] ) );

				for ( len = dens.length - 1; len !== -1; len -= 1 ) {
					coords.push( [ dens[ len ].getCoordinates()[ 0 ], dens[ len ].getCoordinates()[ 1 ] ] );
				}

				feat = new ol.Feature( {
					geometry: new ol.geom.Polygon( [ coords ] ).transform( projLatLon, projMap ) 
				} );

				geomap.locLayer.getSource().addFeature( feat );

				// zoom to extent of feature
				geomap.map.getView().fit( feat.getGeometry().getExtent(), geomap.map.getSize() );

			} else if ( ll != null ) {

				zoom = geomap.map.getView().getZoom() === 0 ? 12 : geomap.map.getView().getZoom();
				feat = new ol.Feature( {
					geometry: new ol.geom.Point( ll.split( "," ) ).transform( projLatLon, projMap ) 
				} );
				geomap.locLayer.getSource().addFeature( feat );

				// zoom to feature
				geomap.map.getView().setZoom( zoom );
				geomap.map.getView().setCenter( feat.getGeometry().getCoordinates() );

			}

		} );

		$document.on( "keyup", "#wb-geomap-geocode-search-" + geomap.mapid, function( evt ) {

			var $dataList = $( "#wb-geomap-geocode-results-" + geomap.mapid ),
				val,
				bnd,
				ll,
				title,
				keycode,
				options = [];

			$( this ).parent().removeClass( "has-error" );

			val = $( this ).val().trim();

			keycode = evt.which;

			if ( val === "" || val.length <= 2 || keycode === 13 || keycode === 9 || keycode === 40 || keycode === 39 || keycode === 38 ) {
				return;
			}

			if ( xhr ) {
				xhr.abort();
			}

			clearTimeout( timer );

			timer = setTimeout( function() {
				xhr = $.get( i18nText.geoLocationURL, {
						q: val + "*"
					}, function( res ) {

					options = "<!--[if lte IE 9]><select><![endif]-->";

					if ( res.length ) {
						for ( var i = 0, len = res.length; i < len; i++ ) {

							title = res[ i ].title
								.replace( /&/g, "&amp;" )
								.replace( /"/g, "&quot;" )
								.replace( /'/g, "&#39;" )
								.replace( /</g, "&lt;" )
								.replace( />/g, "&gt;" );

							bnd = res[ i ].bbox ? res[ i ].bbox[ 0 ] + ", " + res[ i ].bbox[ 1 ] + ", " + res[ i ].bbox[ 2 ] + ", " + res[ i ].bbox[ 3 ] : null;
							ll = res[ i ].geometry && res[ i ].geometry.type === "Point" ? res[ i ].geometry.coordinates[ 0 ] + ", " + res[ i ].geometry.coordinates[ 1 ] : null;
							options += "<option value='" + title + "' data-lat-lon='" + ll + "' data-bbox='" + bnd  + "' data-type='" + res[ i ].type + "'></option>";

							if ( i === len - 1 ) {
								options += "<!--[if lte IE 9]></select><![endif]-->";
								$dataList.html( options );
							}
						}
					}

					if ( $( ".geomap-geoloc .wb-al-cnt" ).length > 0 ) {

						// remove the data list and plugin elements
						$( "#wb-geomap-geocode-search-" + geomap.mapid ).removeClass( "wb-datalist-inited" );
						$( "#wb-geomap-geocode-results-" + geomap.mapid ).remove();
						$( "#wb-al-wb-geomap-geocode-search-" + geomap.mapid ).remove();
						$( "#wb-al-wb-geomap-geocode-search-" + geomap.mapid + "-src" ).remove();

						// add the datalist and initialize the plugin
						$( "#wb-geomap-geocode-search-" + geomap.mapid ).after( $dataList );
						$( "#wb-geomap-geocode-search-" + geomap.mapid ).trigger( "wb-init.wb-datalist" );
					}

				}, "jsonp" );
			}, 500 );
		} );
	},

	GeolocationControl = function( opt_options ) {

		var options = opt_options || {},
			_this = this,
			position,
			accuracyFeature, positionFeature,
			button, coordinates, element, zoom;

		button = document.createElement('button');
		button.setAttribute( "type", "button" );
		button.setAttribute( "title", i18nText.geolocBtn );
		button.innerHTML = "<span class='glyphicon glyphicon-map-marker'></span>";

		element = document.createElement( "div" );
		element.className = "ol-geolocate ol-unselectable ol-control";
		element.appendChild( button );
		
		_this.geolocation = new ol.Geolocation( opt_options );

		function createFeatures() {

			positionFeature = new ol.Feature();
			accuracyFeature = new ol.Feature();
			
			positionFeature.setStyle( getPointStyle( { 
				radius: 6,
				fill: new ol.style.Fill( {
					color: "#3399CC"
				} ),
				stroke: new ol.style.Stroke( {
					color: "#fff",
					width: 2
				} ) } )
			);

			return [ accuracyFeature, positionFeature ];
		}

		ol.control.Control.call( this, {
			element: element,
			target: options.target
		} );

		_this.geolocation.on( "change:accuracyGeometry", function() {
			accuracyFeature.setGeometry( _this.geolocation.getAccuracyGeometry() );
		} );

		_this.geolocation.on( "change:position", function() {
			coordinates = _this.geolocation.getPosition();
			positionFeature.setGeometry( coordinates ?
					new ol.geom.Point( coordinates ) : null );

			// zoom to feature
			var extent = _this.featuresOverlay.getSource().getExtent();
			_this.getMap().getView().fit(extent, _this.getMap().getSize());
		} );

		/* Handle errors. Codes:
			PERMISSION_DENIED: 1
			POSITION_UNAVAILABLE: 2
			TIMEOUT: 3
		*/
		_this.geolocation.on( "error", function( error ) {
			if ( error.code === 2 ) {
				$( "#overlay-location-error h2.modal-title" ).text( i18nText.geolocUncapable );
				$( "#overlay-location-error" ).trigger( "open.wb-overlay" );
			} else {
				$( "#overlay-location-error h2.modal-title" ).text( i18nText.geolocFailed );
				$( "#overlay-location-error" ).trigger( "open.wb-overlay" );
			}
		});

		button.addEventListener( "click", function( e ) {

			if ( typeof _this.featuresOverlay === "undefined" ) {

				_this.featuresOverlay = new ol.layer.Vector( {
					map: _this.getMap(),
					source: new ol.source.Vector( { } )
				} );

				_this.featuresOverlay.getSource().addFeatures( createFeatures() );
				_this.geolocation.setTracking( true );

			} else if ( _this.featuresOverlay.getSource().getFeatures().length === 0 ) {

				_this.featuresOverlay.getSource().addFeatures( createFeatures() );
				_this.geolocation.setTracking( true );

			} else {

				_this.geolocation.setTracking( false );
				_this.featuresOverlay.getSource().clear();

			}

		}, false );

	},

	createGeolocationWidget = function( geomap ) {

		$( "body" ).append(
			"<section id='overlay-location-error' class='wb-overlay modal-content overlay-def wb-bar-t bg-danger'>" +
			"<header><h2 class='modal-title'>Geolocation error.</h2></header>" +
			"</section>"
		);

		$( "#overlay-location-error" ).trigger( "wb-init.wb-overlay" );

//		locationuncapable: function() {
//			
//		},
//		locationfailed: function() {
//			$( "#overlay-location-error h2.modal-title" ).text( i18nText.geolocFailed );
//			$( "#overlay-location-error" ).trigger( "open.wb-overlay" );
//		}

		geomap.map.addControl( new GeolocationControl( { projection: geomap.map.getView().getProjection() } ) );

	},

	/*
	 * Refresh the legend symbols
	 */
	refreshLegend = function() {

		// update size of symbol maps
		if ( symbolMapArray.length !== 0 ) {
			var len, map;
			for ( len = symbolMapArray.length - 1; len !== -1; len -= 1 ) {
				map = symbolMapArray[ len ];

				if ( $( "#" + map.getTarget() ).is( ":visible" ) ) {
					map.updateSize();
				}
			}
		}
	},

	/*
	 * Refresh WET plugins
	 */
	refreshPlugins = function( geomap ) {

		var glayers = geomap.glayers,
			map = geomap.map,
			lyrs = map.getLayers(),
			lyr, lyrLen;
		
		//glayers.find( ".wb-geomap-tabs" ).trigger( "wb-init.wb-tabs" );
		glayers.find( ".wb-tables" ).trigger( "wb-init.wb-tables" );
		

		// Set the alt attributes for images to fix the missing alt
		// attribute. Need to do it after zoom because each zoom brings
		// new tiles to solve this modifications needs to be done to
		// OpenLayers core code ol.Util.createImage and
		// ol.Util.createAlphaImageDiv
		// TODO: fix no alt attribute on tile image in OpenLayers rather
		// than use this override wait 2 seconds for all tile to be loaded
		// in the page
//		setTimeout( function() {
//			geomap.gmap.find( "img" ).attr( "alt", "" );
//			$( ".olTileImage" ).attr( "alt", "" );
//
//			// Identify that initialization has completed
//			wb.ready( $( "#" + geomap.mapid ), componentName, [ map ] );
//		}, 2000 );

	},

	getLayerById = function( map, id ) {
		var lyr, layer;

		map.getLayers().forEach( function( lyr, index ) {
			if ( id === lyr.id ) {
				layer = lyr;
				return;
			}
		} );

		return layer;
	},

	// Retrieve the map, layer and feature using data attributes on an element
	getMapLayerFeature = function( elm ) {

		var map = getMapById( elm.getAttribute( "data-map" ) ),
			layer;

		if ( elm.getAttribute( "data-layer" ) ) {
			layer = getLayerById( map, elm.getAttribute( "data-layer" ) );

			return [
				map,
				layer,
				elm.getAttribute( "data-feature" ) ? layer.getSource().getFeatureById( elm.getAttribute( "data-feature" ) ) : null
			];

		} else {
			return [ map, null, null ];
		}
	},
	/**
	 * Create a random Guid.
	 *
	 * @return {String} a random Guid value.
	 */
	generateGuid = function() {
	  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
	    function(c) {
	      var r = Math.random() * 16 | 0,
	        v = c == 'x' ? r : (r & 0x3 | 0x8);
	      return v.toString(16);
	    }).toUpperCase();
	};
	
	ol.inherits( GeolocationControl, ol.control.Control );

// Bind the init function to the geomap.wb event
$document.on( "geomap.wb", selector, init );

// Handle the Zoom to button events
$document.on( "click", ".geomap-zoomto", function( event ) {
	var which = event.which,
		target = event.target,
		mapId, mapLayerFeature, geometry, extent, view;

	// Ignore middle/right mouse buttons
	if ( !which || which === 1 ) {
		event.preventDefault();
		mapId = target.getAttribute( "data-map" );
		mapLayerFeature = getMapLayerFeature( target );
		geometry = mapLayerFeature[ 2 ].getGeometry();
		extent = geometry.getExtent();
		view = mapLayerFeature[ 0 ].getView();

		//TODO: rework, using undocumented function
		if ( geometry.getType() === "Point" ) {
			view.fit( extent, mapLayerFeature[ 0 ].getSize() );
			view.setZoom( 10 );
			//view.setCenter( geometry.getCoordinates() );
		} else {
			view.fit( extent, mapLayerFeature[ 0 ].getSize() );
		}

		$( "#" + mapId + " .wb-geomap-map" ).trigger( "setfocus.wb" );
	}
} );

// Update the map when the window is resized
$document.on( wb.resizeEvents, function() {
	if ( mapArray.length !== 0 ) {
		var maps = getMap(),
			mapId, map, $mapDiv;
		for ( mapId in maps ) {
			if ( maps.hasOwnProperty( mapId ) ) {
				map = maps[ mapId ];
				$mapDiv = $( map.div );
				$mapDiv.height( $mapDiv.width() * 0.8 );
				map.updateSize();
				//TODO: zoom to map view
				//map.zoomToMaxExtent();
			}
		}
	}
} );

// Handle clicking of checkboxes within the tables
$document.on( "change", ".geomap-cbx", function( event ) {

	var target = event.target,
		feature = getMapLayerFeature( target )[ 2 ],
		map = getMapLayerFeature( target )[ 0 ],
		selectControl = getMapInteraction( map, ol.interaction.Select ),
		tbody = $( this ).closest( "tbody" ),
		checked = target.checked;

	//TODO: create function to do this, as it's done elsewhere as well
	// clear the checkboxes and reset row in the table
	$( tbody ).find( ".geomap-cbx" ).prop( "checked", false );
	$( tbody ).find( ".geomap-cbx" ).closest( "tr" ).removeClass( "active" );
	selectControl.getFeatures().clear();

	// set the active state on row
	$( target ).closest( "tr" ).toggleClass( "active" );

	if ( checked ) {
		$( target ).prop( "checked", true );
		selectControl.getFeatures().push( feature );
	} else {		
		selectControl.getFeatures().remove( feature );
	}
} );

// Handle clicks to the legend checkboxes
$document.on( "change", ".geomap-lgnd-cbx", function( event ) {

	var target = event.target,
		layer = getMapLayerFeature( target )[ 1 ],
		featureTableId = target.value,
		visibility = document.getElementById( "cb_" + featureTableId ).checked,
		$table = $( "table#" + featureTableId ),
		$parent = $table.parents( ".wb-geomap-table-wrapper" ),
		$alert = $( "#msg_" + featureTableId ),
		selectControl = getMapInteraction( getMapLayerFeature( target )[ 0 ], ol.interaction.Select );

	layer.setVisible( visibility );

	if ( !visibility ) {
		//TODO: create function to do this, as it's done elsewhere as well
		// clear the checkboxes and reset row in the table
		$table.find( ".geomap-cbx" ).prop( "checked", false );
		$table.find( ".geomap-cbx" ).closest( "tr" ).removeClass( "active" );
		selectControl.getFeatures().clear();
	}

	$( "#sb_" + layer.name ).toggle( visibility );

	refreshLegend();

	if ( $alert.length !== 0 ) {
		visibility ? $alert.fadeOut() : $alert.fadeIn();
	} else {
		$parent.after( "<div id='msg_" + featureTableId + "'><p>" +
							i18nText.hiddenLayer + "</p></div>" );
	}

	visibility ? $parent.fadeIn() : $parent.fadeOut();
} );

// Enable the keyboard navigation when map div has focus. Disable when blur
// Enable the wheel zoom only on hover
$document.on( "focusin focusout mouseover mouseout", ".wb-geomap-map", function( event ) {
	var target = event.currentTarget,
		map = getMapById( target.getAttribute( "data-map" ) );

	setMapStatus( map, event );
} );

$document.on( "keydown click", ".olPopupCloseBox span", function( event ) {
	var which = event.which,
		target = event.currentTarget;
	if ( event.type === "keydown" ) {
		if ( which === 13 ) {
			getMapLayerFeature( target )[ 2 ].popup.hide();
		}
	} else if ( !which || which === 1 ) {
		getMapById( target.getAttribute( "data-map" ) )
			.getControlsByClass( "ol.Control.SelectFeature" )[ 0 ]
				.unselect( selectedFeature );
	}
} );

} )( jQuery, window, document, wb );
