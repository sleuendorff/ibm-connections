;(function($) {
    var SMZ = (window.SMZ || {});
    window.SMZ = SMZ;
    
    /*oooooooooooooooooooooooooooooooooooooooooooooooooooooooo     */
    /* ENHANCE SEARCH 
    */
    extendLangSearch = function() {
        var targetitems = $("<span />").hide();
        var searchbutton = $("<span />").attr('id','smz-searchbutton').on('click',function(){
            addTranslation($('#j-visor-search-input'));
        }).appendTo('body').hide();
    
        SMZ.searchEnhanced = true;
        SMZ.log("MD.a_15 extending Language Search");
        
        //$('#j-satNav-wrap').append(targetitems).css('border','14px solid green');
        
        var addTranslation = function(el){
            SMZ.log('MD.a_18 addTranslation',el);
            /*
            **   create elements    */
            targetitems.empty();
            var term = $(el).val(),
                targetList = SMZ.multidoc.settings.availableTargetLangsCSV.split(','),
                count = targetList.length, resultstr = "",
                sText = (term.split(' ').length > 1)?"("+term+")":term,
                resultList = [sText];
            
            $.each(targetList, function(i,lang){
                var x = $('<span>'+term+'</span>');
                x.attr('id','searchitem'+lang).appendTo(targetitems);
                SMZ.log("MD.a_33 element ",i,term);

                x.SMZTranslator({                        
                    setAttributes: false,
                    targetLanguage: lang,
                    callback:function(){
                        var ttext = x.text();
                        if (ttext.indexOf(' ') > -1) { 
                            ttext = "("+ttext+")";
                        }
                        if (ttext !== sText) { 
                            resultList.push(ttext);
                        }
                        count -= 1;
                        if (count == 0 ){
                            resultstr = resultList.join(' OR ');
                            doLangSearch(resultstr);
                            SMZ.log("MD.a_50 callback ",i,term,targetitems.text());
                        }
                    }
                });
            });
        };
        if( SMZ.multidoc.settings.searchTranslateDefault == 'true'){
            $('body').on('focus','#j-visor-search-input',function(){
                $('#j-visor-search-input').off('keydown');
            });
            $('body').on('keydown', '#j-visor-search-input', function(e){
                var code= (e.keyCode ? e.keyCode : e.which);
                if (code == 13) {
                    //alert('Enter key was pressed.');
                    addTranslation(this);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    };
    doLangSearch = function(txt) {
        var query = {};

        if(txt.length > 0){
            query["q"]=txt;
        }
        /* TODO find CurrentView
        if(jive.search.getCurrentView() == 'filtered'){
            query[this.filterType] =  this.filter;
        }
        */

//alert($.param(query))
        window.location = _jive_base_url + "/search.jspa" + "?" + $.param(query);
    };
    
    
    /*oooooooooooooooooooooooooooooooooooooooooooooooooooooooo     */
    

    $.SMZAutoTranslator = function(options) {

        var defaults = {
            checkboxLabel : 'original language',
            onSomeEvent: function() {}
        };
        var selectors = SMZ.translationselectors;

        var plugin = this;
        var translateCounter = 0;

        plugin.settings = {};
        

        var init = function() {
            plugin.settings = $.extend({}, defaults, options);
            //SMZ.log("MD.a_138 init-auto")
            
            if (SMZ.multidoc.settings.provider.name == '' || 
                SMZ.multidoc.settings.provider.url == '' || 
                SMZ.multidoc.settings.provider.key == '' ){
                SMZ.log('MD.a_110 SMZ translation provider settings missing …');
                return false;
            } 
            
            var selectors = SMZ.translationselectors;
            var sels = SMZ.multidoc.settings.translatedSelectors;
            if (sels.staticSelectors[0] !== null){
                selectors.staticSelectors = sels.staticSelectors;
            }
            if (sels.dynamicSelectors[0] !== null){
                selectors.dynamicSelectors = sels.dynamicSelectors;
            }
            
            plugin.startStaticTranslation();
            
            if (SMZ.multidoc.settings.searchTranslateDefault == 'true' || 
                SMZ.multidoc.settings.autotranslateEnabled == 'true') {
                extendLangSearch();
            }
        };

        plugin.startStaticTranslation = function() {
            //SMZ.log('MD.a_132 startStaticTranslation');
            searchElementsForTranslation(selectors.staticSelectors);
        };
        
        plugin.startDynamicTranslation = function() {
            //SMZ.log('MD.a_138 startDynamicTranslation');
            searchElementsForTranslation(selectors.dynamicSelectors);
        };
        
        /* reference= SMZ.cachedSettings.showTranslation
        plugin.isOriginalLanguageDisplayed = function() {
            if ($('input#smz-toggle-translation').length==0) {
        		return true;
        	} else {
        		return $('input#smz-toggle-translation').is(":checked");
        	}
        }
        */

        var searchElementsForTranslation = function(selectors) {
            if (SMZ.multidoc.settings.autotranslateEnabled != 'true'){
                SMZ.log('MD.a_152 searchElementsForTranslation autotranslateEnabled != TRUE');
                return false;
            }
            
            $.each(selectors, function(key, value) {
                var useParent = false;
                
                if (value.indexOf('p<') >= 0){
                    useParent = true;
                    value = value.substring(2);
                }
                /*
                if ($(value).length > 0) {
                    SMZ.log("MD.a_165 searchElementsForTranslation ",value,$(value).length);
                }
                */
            
                $(value).each(function(se, sindex) {
                    var t_element = $(this); 
                    translateCounter++;
                    if(useParent){
                        t_element = $(this.parentNode);
                    }

                    appendToggleCheckbox();

                    if (t_element.attr('smz-translated') && t_element.attr('smz-translated')=="1") {
                        //found element is already translated
                    } else {
                    
                        //SMZ.log("MD.a_188 $.each",this,value, t_element.find('iframe,object').length)
                        
                        if(t_element.find('iframe,object,.jive-video-view').length > 0){
                            // video-containing element will not be touched at all.
                            t_element.attr('smz-translated','1');
                        } else {
                        
                            //start preparation and translation for current element
                            t_element.SMZTranslator({            
                                setAttributes: true,
                                showTranslation: SMZ.cachedSettings.showTranslation,
                                selector: value
                                //showTranslation: plugin.isOriginalLanguageDisplayed()//,
                                //callback:function(){ SMZ.log("MD.a_193 obj",value,this.innerHTML.substr(0,20),this);}
                            });
                        }
                    }
                });
            });
        };

        var appendToggleCheckbox = function() {
            if ($('input#smz-toggle-translation').length==0) {
        		jQuery('<div/>', {
        		    id: 'smz-toggle-translation-wrapper',
        		    'class': 'smz-topbar-toggle-translations-checkbox',
        		    'title': SMZ.multidoc.settings.provider.about
        		}).appendTo(SMZ.multidoc.settings.checkboxLocation);
        		
        		var elementAttributes = {
        			id: 'smz-toggle-translation',
        			'type': 'checkbox',
        			change: function() {
                 		SMZ.cachedSettings.showTranslation = (this.checked);
                    SMZ.localStorage("SMZ_autotranslate",SMZ.cachedSettings);
                 		if (SMZ.cachedSettings.showTranslation) {
                            SMZ.setVisLang('smzTranslateTranslated');
                            if($('.smz-translated.loading').length > 0){
                                SMZ.multidoc.fireRequests();
                            }
                 		} else {
                            SMZ.setVisLang('smzTranslateOriginal');
                 		}
                 		//alert("xx "+SMZ.cachedSettings + "--"+jive.ieVersion())
        			}
        		};
        		
        		//alert("0 "+SMZ.cachedSettings + "--"+jive.ieVersion())
        		if (SMZ.cachedSettings.showTranslation === true){
        		    elementAttributes.checked = 'checked';
        		}
        		$('<input/>',elementAttributes).prependTo($('#smz-toggle-translation-wrapper'));
        		jQuery('<label/>', {
        		    'id': 'smz-toggle-translation-label',
        		    'for': 'smz-toggle-translation',
        		    'text': SMZ.multidoc.settings.checkboxLabel
        		}).appendTo('#smz-toggle-translation-wrapper');
        	}
        };

        init();
    }

})(jQuery);

//var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

jQuery(function() {
    var $ = jQuery;
    var SMZ = (window.SMZ || {});
    window.SMZ = SMZ;
    
    if(SMZ.multidoc == undefined){
        // Soyhook not available on certain pages, preventing error in console because SMZ is not defined
        // https://community.jivesoftware.com/casethread/363628
        if (console != undefined) {
            console.log('SMZ.multidoc == undefined');
        }
        //SMZ.log('SMZ.multidoc == undefined');
        return false;
    }
    
    SMZ.log('MD.a_250 SMZ.autoTranslator starting …');
    
    /*
//    $('div').onpropertychange
    if (MutationObserver) {
        SMZ.observer = new MutationObserver(function(mutations, observer) {
            // fired when a mutation occurs
            /* 
            SMZ.log("MD.a_ #####",SMZ, mutations, observer);
            *   /
            if(SMZ.autoTranslator != null){
                //SMZ.autoTranslator.startWatchTranslation();
                SMZ.autoTranslator.startDynamicTranslation();
            }
            // ...
        });
        
        // TODO define what element should be observed by the observer
        // and what types of mutations trigger the callback
        SMZ.observer.observe(document, {
          subtree: true,
          attributes: true
          //...
        });
    } else {
        setTimeout(function(){
            setInterval(function(){
                SMZ.autoTranslator.startDynamicTranslation();
            },3000);
        }, 1500);
    }
    */
    
    // if "document" (multidoc issue with jivemacros)
    if($('#createNewLangDoc').length || $('#createNewLangBlogpost').length){
        var content = {markup: $('.jive-content-body .jive-rendered-content').html()};
        SMZ.localStorage("SMZ_rendered_document",content);
        var contentLang = {locale: $('#redirectToLangDoc').val() || $('#redirectToLangBlogpost').val()};
        SMZ.localStorage("SMZ_rendered_document_lang", contentLang);
    }
    

    SMZ.autoTranslator = new $.SMZAutoTranslator({});
    
    // instead of mutationobserver which triggers many times on load. 
    // todo: make timeout for mutationobs...
    if (SMZ.multidoc.settings.autotranslateEnabled == 'true') {
        setTimeout(function(){
            setInterval(function(){
                SMZ.autoTranslator.startDynamicTranslation();
            },3000);
            SMZ.autoTranslator.startDynamicTranslation();
        }, 1500);
    }
    
    if(typeof console === 'object' && typeof console.log === 'function'){
        console.log('SMZ MultiDoc Plugin',SMZ.multidoc.settings, SMZ);
    }
    
});

