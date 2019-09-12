import Component from 'metal-component/src/Component';
import Soy from 'metal-soy/src/Soy';
import core from 'metal/src/core';
import Ajax from 'metal-ajax/src/Ajax';
import MultiMap from 'metal-multimap/src/MultiMap';

import GSearchUtils from '../js/GSearchUtils.es';
import HYUtils from '../js/HYUtils.es';

import templates from './GSearchHYMenus.soy';

/**
 * GSearch HY component.
 */
class GSearchHYMenus extends Component {

	/**
	 * @inheritDoc
	 */
	attached() {

		if (this.debug) {
			console.log("GSearchHYMenus.attached()");
		}
		
		// Set initial query parameters from calling url.

		HYUtils.setInitialQueryParameters(
			this.initialQueryParameters, 
			this.templateParameters, 
			this.setQueryParam
		);	
	}
	
	/**
	 * @inheritDoc
	 */
	rendered() {
		
		if (this.debug) {
			console.log("GSearchHYMenus.rendered()");
		}
		
		// Setup type menu.
		
		this.setupTypeMenu();

		// Setup type menu.
		
		this.setupUnitMenu();
		
		// Setup time range filter.
		
		this.setupTimeRangeFilter();
		
		// Set initial range values.
		
		this.setInitialDateRangeParameters();	

		HYUtils.bulkSetupOptionLists(
			this.portletNamespace + 'Facets',
			'timemenu',
			this.getQueryParam,
			this.setQueryParam
		);
	}
	
	/**
	 * Setup time range filters
	 */
	setupTimeRangeFilter() {
		
		let language = Liferay.ThemeDisplay.getLanguageId().substring(0,2);

		let _self = this;
		
		$('#' + this.portletNamespace + 'FilterByTimeRange').on('click', function(event) {
			$('#' + _self.portletNamespace + 'RangeSelection').removeClass('hide');
		});
		
		Liferay.Loader.require('bootstrap-datepicker', function() {

			$.fn.datepicker.dates.fi = {
					days:["sunnuntai","maanantai","tiistai","keskiviikko","torstai","perjantai","lauantai"],
					daysShort:["sun","maa","tii","kes","tor","per","lau"],
					daysMin:["su","ma","ti","ke","to","pe","la"],
					months:["tammikuu","helmikuu","maaliskuu","huhtikuu","toukokuu","kesäkuu","heinäkuu","elokuu","syyskuu","lokakuu","marraskuu","joulukuu"],
					monthsShort:["tam","hel","maa","huh","tou","kes","hei","elo","syy","lok","mar","jou"],
					today:"tänään",
					clear:"Tyhjennä",
					weekStart:1
				};			

			$.fn.datepicker.dates.sv = {
					days:["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"],
					daysShort:["Sön","Mån","Tis","Ons","Tor","Fre","Lör"],
					daysMin:["Sö","Må","Ti","On","To","Fr","Lö"],
					months:["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"],
					monthsShort:["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"],
					today:"Idag",
					weekStart:1,
					clear:"Rensa"
				};

			// Dateformat is crippled because of conflict between Java and JS yyyy-MM-dd.

			$('#' + _self.portletNamespace + 'RangeSelection .start').datepicker({
				autoclose: true,
				calendarWeeks: true,
			    format: _self.datePickerFormat.toLowerCase(),
			    language: language,
			    startDate: '',
			    todayHighlight: true,
			    toggleActive: true
			}).on('changeDate', function(event) {

				let timeFrom = $('#' + _self.portletNamespace + 'RangeSelection .start').val();
				
				_self.setQueryParam('time', 'range', false, false);
				_self.setQueryParam('timeFrom', timeFrom, true, false);
				_self.setDateRangeSelected();
			});
			
			$('#' + _self.portletNamespace + 'RangeSelection .end').datepicker({
				autoclose: true,
				calendarWeeks: true,
			    format: _self.datePickerFormat.toLowerCase(),
			    language: language,
			    startDate: '',
			    todayHighlight: true,
			    toggleActive: true
			}).on('changeDate', function(event) {

				let timeTo = $('#' + _self.portletNamespace + 'RangeSelection .end').val();

				_self.setQueryParam('time', 'range', false, false);
				_self.setQueryParam('timeTo', timeTo, true, false);
				_self.setDateRangeSelected();

			});
		});
		
		// Set a listener to empty range values on other selection
		
		$('#' + this.portletNamespace + 'TimeFilterOptions').find('a').on('click', function(event) {
			$('#' + _self.portletNamespace + 'RangeSelection .start').val('');
			$('#' + _self.portletNamespace + 'RangeSelection .end').val('');

			_self.setQueryParam('timeFrom', '', false, false);
			_self.setQueryParam('timeTo', '', false, false);

		});
		
		// Setup menu events.
		
		$('#' + this.portletNamespace + 'TimeFilter').on('click', function(event) {
			
			$('#' + _self.portletNamespace + 'TimeMenu').toggleClass('open');

            if ($(this).attr( 'aria-expanded') === 'true') {
                $(this).attr( 'aria-expanded', 'false');
            } else {
                $(this).attr( 'aria-expanded', 'true');
            }
			
			_self.timeMenuOpen = _self.timeMenuOpen ? false : true;
			
			if (_self.timeMenuOpen) {
				_self.unitsMenuOpen = false;
				$('#' + _self.portletNamespace + 'UnitMenu').removeClass('open');
                $('#' + _self.portletNamespace  + 'UnitFilter').attr( 'aria-expanded', 'false');
			}

			event.preventDefault();
			
		});		
		
		// After rerender, open the menu if it was left open.
		
		if (this.timeMenuOpen) {
			$('#' + this.portletNamespace + 'TimeMenu').addClass('open');
            $('#' + this.portletNamespace + 'TimeFilter').attr( 'aria-expanded', 'true');
		}
    }
	
	/**
	 * Set initial parameters for date range selector.
	 */
	setInitialDateRangeParameters() {
		
        let timeParam = this.getQueryParam('time', true);
    	
        if ('range' == timeParam) {
        	
            let rangeStart = this.getQueryParam('timeFrom', true);
        	let rangeEnd = this.getQueryParam('timeTo', true);

        	if (rangeStart != null) {
        		this.setQueryParam('timeFrom', rangeStart, false, false);
    			$('#' + this.portletNamespace + 'RangeSelection .start').val(rangeStart);
        	}
        
        	if (rangeStart != null) {
        		this.setQueryParam('timeTo', rangeEnd, false, false);
    			$('#' + this.portletNamespace + 'RangeSelection .end').val(rangeEnd);
        	}
        	
        	this.setDateRangeSelected();
        }
	}

	/**
	 * Set date range as selected menu option
	 */
	setDateRangeSelected() {
		
		//let selectedText = $('#' + this.portletNamespace + 'RangeSelectionTitle').html();

		// $('#' + this.portletNamespace + 'TimeFilter .selection').html(selectedText);
		
		$('#' + this.portletNamespace + 'TimeFilterOptions').find('li').removeClass('selected');
	}	
	
	/**
	 * Setup type menu
	 * 
	 */
	setupTypeMenu() {

		let _self = this;

		let paramName = 'hf';
		
		let triggerElementId = this.portletNamespace + 'TypeFilter';

		let optionElementId = triggerElementId + 'Options';
		
        let currentValues = _self.getQueryParam(paramName);

		$('#' + this.portletNamespace + 'TypeFilterOptions :checkbox').on('click', function(event) {

            let value = $(this).attr('data-value');

            // Handle everything selection.
            
            if (value === 'everything') {
            	
        		_self.setQueryParam(paramName, null, true, true, '');

			}
            
            let currentValues = _self.getQueryParam(paramName);

            if (value !== 'everything') {
                if (currentValues.indexOf(value) > -1) {

                    _self.setQueryParam(paramName, null, true, true, value);

                } else {

                    _self.setQueryParam(paramName, value, true, true);

                }
            }

            let clickTarget = $(event.currentTarget);
		});
		
		// Setup selected items.
		
		HYUtils.setOptionListSelectedItems(optionElementId, triggerElementId, currentValues, true);
	}
	
	/**
	 * Setup units menu and events.
	 * 
	 */
	setupUnitMenu() {

		let _self = this;

		let paramName = 'unit';
		
        let currentValues = _self.getQueryParam(paramName);

		let triggerElementId = this.portletNamespace + 'UnitFilter';

		let optionElementId = triggerElementId + 'Options';

		$('#' + optionElementId).find(' :checkbox').on('click', function(event) {

            let value = $(this).attr('data-value');
            
            let currentValues = _self.getQueryParam(paramName);

            if (currentValues.indexOf(value) > -1) {
            	
        		_self.setQueryParam(paramName, null, true, true, value);
        		
            } else {
            	
                _self.setQueryParam(paramName, value, true, true);
            }

            // Typefilter has to be reseted

            _self.setQueryParam('hf', null, true, true, '');
            
            let clickTarget = $(event.currentTarget);
		});
		
		// Open the menu by default if there are selections.
		
		$('#' + triggerElementId).on('click', function(event) {
			
			$('#' + _self.portletNamespace + 'UnitMenu').toggleClass('open');

			_self.unitsMenuOpen = _self.unitsMenuOpen ? false : true;

            if ($(this).attr( 'aria-expanded') === 'true') {
                $(this).attr( 'aria-expanded', 'false');
            } else {
                $(this).attr( 'aria-expanded', 'true');
            }
			
			if (_self.unitsMenuOpen) {
				_self.timeMenuOpen = false;
				$('#' + _self.portletNamespace + 'TimeMenu').removeClass('open');
                $('#' + _self.portletNamespace + 'TimeFilter').attr('aria-expanded', 'false');
			}

			event.preventDefault();
			
		});

        $(document).on('mouseup keyup',function (e) {
            if (!$('.gsearch-dropdown .dropdown-menu').is(e.target) && $('.gsearch-dropdown .dropdown-menu').has(e.target).length === 0 &&
                !$('.gsearch-dropdown .dropdown-toggle').is(e.target) && $('.gsearch-dropdown .dropdown-toggle').has(e.target).length === 0) {
                _self.unitsMenuOpen = false;
                _self.timeMenuOpen = false;
                $('.gsearch-dropdown').removeClass('open');
                $('.gsearch-dropdown .dropdown-toggle').attr('aria-expanded', 'false');
            }
        });
		 
		// After rerender, open the menu if it was left open.
		
		if (this.unitsMenuOpen) {
			$('#' + this.portletNamespace + 'UnitMenu').addClass('open');
            $('#' + this.portletNamespace + 'UnitFilter').attr('aria-expanded', 'true');
		}
		
		// Setup selected items.
		
		HYUtils.setOptionListSelectedItems(optionElementId, triggerElementId, currentValues, true);
	}
	
	/**
	 * @inheritDoc 
	 */
	shouldUpdate(changes, propsChanges) {

		if (this.debug) {
			console.log("GSearchHYMenus.shouldUpdate()");
		}		

		$('#' + this.portletNamespace + 'Facets .optionmenu').remove();

		return true;
    }		
}

/**
 * State definition.
 * @type {!Object}
 * @static
 */
GSearchHYMenus.STATE = {
	datePickerFormat: {
		value: 'dd-mm-yyyy'
	},
	debug: {
		value: false
	},
	facetFields: {
		value: null
	},
	getQueryParam: {
		validator: core.isFunction
	},
	initialQueryParameters: {
		value: null
	},
	setQueryParam: {
		validator: core.isFunction
	},
	templateParameters: {
		value: ['time', 'hf', 'unit']
	}	
	
};

// Register component

Soy.register(GSearchHYMenus, templates);

export default GSearchHYMenus;