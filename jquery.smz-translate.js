;(function ($, window, document) {

    var pluginName = "SMZTranslator",
        /**
         /// SMZ = (!window.SMZ)?{}:window.SMZ,
         * available options, can be set when plugin is initialized
         * $(jQueryElement).SMZTranslator({ text: '', '... });
         */

        defaults = {
            setAttributes: false,
            defaultLocation: '#j-links',
            sourceLanguage: '',
            targetLanguage: '',
            maxLength: 750,
            text: null,
            identifier: null,
            callback: null,
            isTiny: null,
            allowHtml: true
        },
        defaultLanguage = 'en',
        text = null,
        originalText = null,
        translatedText = null,
        textSnippets = null,
        errorStop = false,
        report = '',

        /* custom sets of methods for each service */
        services = {
            'GOOGLE': {
                about: 'Translation courtesy of Google',
                requestToken: function (callback) {
                    // no token needed
                    if (callback != undefined) {
                        callback();
                    }
                },
                parseToken: function () {
                },
                getUrl: function () {
                    return SMZ.multidoc.settings.provider.url
                },
                getParams: function (text, options) {
                    var baseParams = {
                        q: text,
                        key: SMZ.multidoc.settings.provider.key,
                        target: options.targetLanguage
                    };
                    if (defaults.sourceLanguage != "") {
                        baseParams.source = defaults.sourceLanguage
                    }
                    return baseParams;
                },
                getCallback: function () {
                    return 'callback'
                },
                getResult: function (d, oTxt) {
                    var txt = report = oTxt;
                    if (d.data !== undefined) {
                        txt = d.data.translations[0].translatedText;
                    } else {
                        report += " not translated!!"
                        if (d.error !== undefined) {
                            report += " =>> " + d.error.message
                            SMZ.log('MD_ 60 report', report, d);
                        }
                    }
                    //SMZ.log("MD_ 77 "+txt,oTxt);
                    return txt;
                }
            },
            'MICROSOFT': {
                about: 'Translation courtesy of MICROSOFT',
                requestToken: function (callback) {
                    var now = new Date();
                    //SMZ.log('MD_ #### requestToken cache',SMZ.multidoc.settings.provider.tokenExpires,SMZ.multidoc.settings.provider.tokenExpires > now.getTime());
                    if (SMZ.multidoc.settings.provider.token != undefined &&
                        SMZ.multidoc.settings.provider.tokenExpires > now.getTime()) {
                        //SMZ.log("MD_ 87 - token found: " + SMZ.multidoc.settings.provider.tokenExpires)
                        if (callback != undefined) {
                            callback();
                        }
                        return SMZ.multidoc.settings.provider.token;
                    } else {
                        $.serviceQueue(callback);
                    }
                    return '';
                },
                parseToken: function (response) {
                    // AzureTokenAccessorUtil appends expiry date to token.
                    var appendIndex = response.accesstoken.lastIndexOf('&');
                    var token = response.accesstoken.substring(0, appendIndex);
                    var expires = new Date();
                    var appended = response.accesstoken.substring(appendIndex+1);
                    var parsedParam = appended.split('=');
                    if (parsedParam[0] == 'ExpiresOn') { // Everything is ok and as expected.
                        expires = new Date(Number(parsedParam[1]));
                        SMZ.multidoc.settings.provider.token = encodeURIComponent(token);
                        SMZ.multidoc.settings.provider.tokenExpires = expires;

                        SMZ.localStorage("SMZ_translation_provider", SMZ.multidoc.settings.provider);
                        SMZ.log("MD_109 token received ", encodeURIComponent(token));
                    } else { // Param MUST be ExpiresOn. If not, something has gone horribly wrong.
                        SMZ.log("ERROR! Last param isn't expiry date. ", response.accesstoken);
                    }
                },
                getUrl: function () {
                    return SMZ.multidoc.settings.provider.url
                },

                getParams: function (text, options) {
                    var pString = 'appId=Bearer ' + SMZ.multidoc.settings.provider.token,
                        toCode = options.targetLanguage;

                    // if chinese, the "to"-value needs to be either "zh-cht" or "zh-chs"
                    toCode = (toCode === 'zh') ? 'zh-chs' : toCode;

                    // remove quotes as bing terminates strings internally there.
                    text = text.replace(/\"/gi, '\”');

                    // OBACHT – test
                    //                    SMZ.log('MD_ >>>>>>>>>>>>> '+text.substr(0,20));
                    //                    text = "'Pourquoi pas?' Dit le roi, prit la chandelle verte, et nous a soufflé une chanson.";

                    pString += '&texts=["' + encodeURIComponent(text) + '"]';
                    pString += '&to=' + toCode + '';
                    pString += '&from="' + options.sourceLanguage + '"';

                    return pString;
                },
                getCallback: function () {
                    return 'oncomplete'
                },
                getResult: function (d, oTxt) {
                    var txt = report = oTxt;
                    if (d[0] !== undefined) {
                        this.addLogo();
                        txt = d[0].TranslatedText;
                    } else {
                        report += " not translated!!"
                        if (d.error !== undefined) {
                            report += " =>> " + d.error.message
                        }
                        SMZ.log('MD_ report', report, d);
                    }
                    return txt;
                },
                addLogo: function () {
                    if ($('#translationsbyms').length == 0) {
                        var imgurl = 'url("/plugins/smz-multidoc-plugin/resources/images/MSTLogoBlack50.png")',
                            linkurl = 'http://aka.ms/MicrosoftTranslatorAttribution';
                        theLink = $('<a>Translations by</a>').attr('id', 'translationsbyms').attr('target', '_blank').attr('href', linkurl).css({
                            'padding': '4px 55px 0 0',
                            'margin': '0 20px 0 0',
                            'background-image': imgurl,
                            'background-repeat': 'no-repeat',
                            'background-position': 'right center'
                        }).prependTo('#j-footer-poweredBy');
                    }
                }
            },
            'LIONBRIDGE': {
                about: 'Translation courtesy of LIONBRIDGE',
                tokenValid: (10 * 60 * 1000), // 10 min
                extendLang: function (l) {
                    var lang = l; // Languages supported: http://developers.lionbridge.com/communication/docs/index.html#Translate.htm
                    var locales = {
                        'ar': 'aa',
                        'bg': 'bg',
                        'ca': 'es',
                        'zh': 'cn',
                        'cs': 'cz',
                        'da': 'dk',
                        'nl': 'nl',
                        'en': 'us',
                        'et': 'ee',
                        'fi': 'fi',
                        'fr': 'fr',
                        'de': 'de',
                        'el': 'gr',
                        'ht': 'ht',
                        'he': 'il',
                        'hi': 'in',
                        'mww': 'mww',
                        'hu': 'hu',
                        'id': 'id',
                        'it': 'it',
                        'ja': 'jp',
                        'ko': 'kr',
                        'lv': 'lv',
                        'lt': 'lt',
                        'ms': 'my',
                        'nb': 'no',
                        'pl': 'pl',
                        'pt': 'pt',
                        'ro': 'ro',
                        'ru': 'ru',
                        'sk': 'sk',
                        'sl': 'si',
                        'es': 'es',
                        'sv': 'se',
                        'th': 'th',
                        'tr': 'tr',
                        'uk': 'ua',
                        'ur': 'af',
                        'vi': 'vn'
                    };
                    if (l.length < 4) {
                        var loc = (locales[l] || l);
                        lang += '-' + loc;
                    }
                    return lang;
                },
                getLanguages: function () { // Probably not needed in full (remove source-lang parts?)
                    var service = this;
                    if (SMZ.multidoc.settings.provider.langs == undefined) {
                        var baseParams = {
                            accountKey: SMZ.multidoc.settings.provider.key,
                            sessionToken: SMZ.multidoc.settings.provider.token
                        };
                        SMZ.multidoc.settings.provider.langs = {};
                        $j.ajax({
                            url: SMZ.multidoc.settings.provider.url + '/Languages',
                            dataType: "jsonp",
                            data: baseParams,
                            contentType: "text/plain; charset=utf-8",
                            success: function (response) {
                                var target = 'en-us', sources = {}, kombis = {};
                                $.each(response, function (i, l) {
                                    if (kombis[l.Source.Code] == undefined) {
                                        kombis[l.Source.Code] = {}
                                    }
                                    kombis[l.Source.Code][l.Target.Code] = 1;

                                    if (l.Target.Code.substr(0, 2) == defaults.targetLanguage) {
                                        target = l.Target;
                                        sources[l.Source.Code] = l.Source;
                                    }
                                });

                                SMZ.multidoc.settings.provider.langs = {
                                    target: target,
                                    sources: sources,
                                    kombis: kombis
                                };
                                SMZ.multidoc.settings.provider.langreceived = true;
                                SMZ.localStorage("SMZ_translation_provider", SMZ.multidoc.settings.provider);
                                SMZ.log('MD_188 - Languages retrieved - SMZ.multidoc.settings.provider.langs > ', SMZ.multidoc.settings.provider.langs);

                                if ($('#translate-from-master').length > 0) {
                                    var langs = $('#translate-from-master:checkbox').data('langs');
                                    var test = service.isLangAvailable(langs.from, langs.to);
                                    if (test) {
                                        $('#translate-from-master').parent().show();
                                    }
                                    //SMZ.log('MD_204 SMZ translate-from-master',thextendLang(langs.from),extL(langs.to),test);
                                }

                            },
                            error: function (data, error) {
                                failed = 1;
                                SMZ.log('MD_156 Translate service #### ERROR', error, '####', data, '####');
                            }
                        });
                        $('#translate-from-master').parent().hide();
                    } else {
                        if ($('#translate-from-master').length > 0) {
                            var langs = $('#translate-from-master:checkbox').data('langs');
                            var test = this.isLangAvailable(langs.from, langs.to);
                            if (!test) {
                                $('#translate-from-master').parent().hide();
                            }
                            //SMZ.log('MD_204 SMZ translate-from-master',thextendLang(langs.from),extL(langs.to),test);
                        }
                    }
                },
                requestToken: function (callback) {

                    var now = new Date();
                    //SMZ.log('MD_192 tokenExpires > now',SMZ.multidoc.settings.provider.tokenExpires > now.getTime());
                    if (SMZ.multidoc.settings.provider.token != undefined &&
                        SMZ.multidoc.settings.provider.tokenExpires > now.getTime() &&
                        SMZ.multidoc.settings.provider.langreceived == true) {
                        this.getLanguages(); // the only function which is getting called every time when a page loads.
                        if (callback != undefined) {
                            callback();
                        }
                        //Dummy invalid token
//                        SMZ.multidoc.settings.provider.token = "npRqX7ntMfQiv%2Baa3vnkEaS57boMDye9l%2FH8P3a%2BxBSFmpC59SF1vawrFhu3Yq5DnjFxSeJZvKtmEAV8%2FrQCHgDIYSbaLKR8IxONkr5nAAJjeHN9SaJ4VuG49noijZ0Iu3Qr31UV1dTI0e3dAA0kZPirEoDOkHBTrfIDuQsay5Ke1oYHuYzxc4etGSjnyv%2B1sh0AGbE8Nkf1bVHpC3nWmC4F%2FnvEn6YTV1bMo1tOc5U%3D";
                        return SMZ.multidoc.settings.provider.token;
                    }

                    $.serviceQueue(callback);
                    return '';
                },
                parseToken: function (response) {
                    var expires = new Date().getTime() + this.tokenValid;
                    var parsedParams = response.accesstoken.split('&');
                    $.each(parsedParams, function (i, p) {
                        var param = p.split('=');
                        if (param[0] == 'ExpiresOn') {
                            expires = new Date(Number(param[1]) * 1000);
                        }
                    });
                    //alert(expires)
                    SMZ.multidoc.settings.provider.token = response.accesstoken;
                    SMZ.multidoc.settings.provider.tokenExpires = expires;
                    this.getLanguages();

                    SMZ.localStorage("SMZ_translation_provider", SMZ.multidoc.settings.provider);
                    SMZ.log("MD_219 token received ", response.accesstoken)
                },
                getUrl: function () {
                    return SMZ.multidoc.settings.provider.url + '/translatearray'
                },
                isLangAvailable: function (from, to) {
                    var source = this.extendLang(from),
                        target = this.extendLang(to);
                    var kombis = SMZ.multidoc.settings.provider.langs.kombis;
                    var available = (kombis[source] != undefined && kombis[source][target] != undefined);
                    if (!available) {
                        SMZ.log("MD_242 kombi FAIL _ " + source + '/' + target);
                    }
                    return available;
                },
                getParams: function (text, options) {
                    var target = this.extendLang(options.targetLanguage);
                    var baseParams = {
                        to: target,
                        text: text,
                        accountKey: SMZ.multidoc.settings.provider.key,
                        sessionToken: SMZ.multidoc.settings.provider.token
                    };
                    return baseParams;
                },
                getCallback: function () {
                    return 'callback'
                },
                getResult: function (d, oTxt) {
                    var txt = report = oTxt;
                    if (d[0] !== undefined && d[0].Error === null) {
                        this.addLogo();
                        txt = d[0].Text;
                    } else {
                        report += " not translated!!";
                        if (d.Message !== undefined) {
                            report += " =>> " + d.Message;
                        } else if (d[0].Error !== undefined) {
                            report += " =>> " + d[0].Error;
                        }
                        SMZ.log("MD_251 report", report, d);
                    }
                    return txt;
                },
                addLogo: function () {
                    if ($('#translationsbyms').length == 0) {
                        var imgurl = 'url("/plugins/smz-multidoc-plugin/resources/images/MSTLogoBlack50.png")',
                            linkurl = 'http://aka.ms/MicrosoftTranslatorAttribution';
                        theLink = $('<a>Translations by</a>').attr('id', 'translationsbyms').attr('target', '_blank').attr('href', linkurl).css({
                            'padding': '4px 55px 0 0',
                            'margin': '0 20px 0 0',
                            'background-image': imgurl,
                            'background-repeat': 'no-repeat',
                            'background-position': 'right center'
                        }).prependTo('#j-footer-poweredBy');
                    }
                }
            },
            'MSAZURE': {
                about: 'Translation courtesy of MICROSOFT',
                requestToken: function (callback) {
                    var now = new Date();
                    if (SMZ.multidoc.settings.provider.token != undefined &&
                        SMZ.multidoc.settings.provider.tokenExpires > now.getTime()) {
                        if (callback != undefined) {
                            callback();
                        }
                        return SMZ.multidoc.settings.provider.token;
                    } else {
                        $.serviceQueue(callback);
                    }
                    return '';
                },
                parseToken: function (response) {
                    var parsedParams = response.accesstoken.split('&');
                    var token = parsedParams[0];
                    $.each(parsedParams, function (i, p) {
                        var param = p.split('=');
                        if (param[0] == 'ExpiresOn') {
                            expires = new Date(Number(param[1]));
                        }
                    });

                    //alert(expires)
                    SMZ.multidoc.settings.provider.token = encodeURIComponent(token);
                    SMZ.multidoc.settings.provider.tokenExpires = expires;

                    SMZ.localStorage("SMZ_translation_provider", SMZ.multidoc.settings.provider);
                    SMZ.log("MD_109 token received ", encodeURIComponent(token))
                },
                getUrl: function () {
                    return SMZ.multidoc.settings.provider.url
                },

                getParams: function (text, options) {
                    var pString = 'appId=Bearer ' + SMZ.multidoc.settings.provider.token,
                        toCode = options.targetLanguage;

                    // if chinese, the "to"-value needs to be either "zh-cht" or "zh-chs"
                    toCode = (toCode === 'zh') ? 'zh-chs' : toCode;

                    // remove quotes as bing terminates strings internally there.
                    text = text.replace(/\"/gi, '\”');

                    // OBACHT – test
                    //                    SMZ.log('MD_ >>>>>>>>>>>>> '+text.substr(0,20));
                    //                    text = "'Pourquoi pas?' Dit le roi, prit la chandelle verte, et nous a soufflé une chanson.";

                    pString += '&texts=["' + encodeURIComponent(text) + '"]';
                    pString += '&to=' + toCode + '';
                    pString += '&from="' + options.sourceLanguage + '"';

                    return pString;
                },
                getCallback: function () {
                    return 'oncomplete'
                },
                getResult: function (d, oTxt) {
                    var txt = report = oTxt;
                    if (d[0] !== undefined) {
                        this.addLogo();
                        txt = d[0].TranslatedText;
                    } else {
                        report += " not translated!!"
                        if (d.error !== undefined) {
                            report += " =>> " + d.error.message
                        }
                        SMZ.log('MD_ report', report, d);
                    }
                    return txt;
                },
                addLogo: function () {
                    if ($('#translationsbyms').length == 0) {
                        var imgurl = 'url("/plugins/smz-multidoc-plugin/resources/images/MSTLogoBlack50.png")',
                            linkurl = 'http://aka.ms/MicrosoftTranslatorAttribution';
                        theLink = $('<a>Translations by</a>').attr('id', 'translationsbyms').attr('target', '_blank').attr('href', linkurl).css({
                            'padding': '4px 55px 0 0',
                            'margin': '0 20px 0 0',
                            'background-image': imgurl,
                            'background-repeat': 'no-repeat',
                            'background-position': 'right center'
                        }).prependTo('#j-footer-poweredBy');
                    }
                }
            }
        };

    $j(function () {  // DOM ready SMZ available…
        if (SMZ.multidoc == undefined) {
            return false;
        }

        SMZ.localStorage = function (key, value) {
            var result = null,
                parse = function (v) {
                    var r;
                    try {
                        r = JSON.parse(v);
                        return r;
                    } catch (e) {
                        return {error: e, param: v};
                    }
                };
            if (value) {
                if (typeof value === 'object') {
                    result = JSON.stringify(value);
                    localStorage[key] = result;
                } else {
                    result = value.toString();
                    localStorage[key] = result;
                }
                result += ' written to ' + key;
            } else {
                result = parse(localStorage[key]);
            }
            return result;
        };

        SMZ.debug = function (n) {
            SMZ.debugmode = (n || 1);
            SMZ.localStorage("SMZ_debugmode", SMZ.debugmode);
            return 'ok, debugmode is ' + SMZ.debugmode;
        };
        SMZ.debugmode = SMZ.localStorage("SMZ_debugmode");
        if (SMZ.debugmode.error) {
            SMZ.debugmode = 0;
        }

        if (location.href.indexOf("http://local") === 0) {
            SMZ.debugmode = Math.max(1, SMZ.debugmode);
        }

        SMZ.log = function () {
            //if (location.href.indexOf("http://local") === 0) { SMZ.debugmode = Math.max(1,SMZ.debugmode); }

            if (SMZ.debugmode > 0 && typeof console === 'object' && typeof console.log === 'function') {
                var indent = '· SMZ _';
                $j.each(arguments, function (i, e) {
                    console.log(indent, e);
                    indent = '      _';
                });
            }

            if (SMZ.debugmode > 1) {
                var content = '';
                $j.each(arguments, function (i1, e1) {
                    if (typeof e1 == 'object') {
                        $j.each(e1, function (i2, e2) {
                            content += ' - ' + i1 + ' _ ' + i2 + ': ' + e2 + ' \n\r';
                        });
                    } else {
                        content += ' - ' + +i1 + ': ' + e1 + ' \n\r';
                    }
                });
                alert(content);
            }
        };
        SMZ.log('MD_321 starting …', 'debugmode: ' + SMZ.debugmode);


        SMZ.multidoc.error = function (msg) {
            var wDiv = jQuery('<div/>', {
                'class': 'warning',
                'title': msg
            }).appendTo(SMZ.multidoc.settings.checkboxLocation);
            jQuery('<span/>', {
                'class': 'jive-icon-warn jive-icon-med'
            }).appendTo(wDiv);
            jQuery('<span/>', {
                'text': 'auto translation failure'
            }).appendTo(wDiv);
        };

        SMZ.snippets = {
            // ------ when snippet has been found, collect all callbacks
            // ------ independent of plugin as snippets are not unique
            add: function (hash, obj, n) {
                //SMZ.log("MD_ 323 SMZ.snippets.add",obj.hashCodes[n],obj.textSnippets[n] )

                if (!this[hash]) {
                    this[hash] = {
                        response: {},
                        received: false,
                        instances: [{obj: obj, n: n}]
                    };

                    window[hash] = function (response) {
                        SMZ.snippets.set(hash, response);
                    };
                    return true;
                } else {
                    if (this[hash].received === true) {
                        obj.callback(this[hash].response, n);
                    } else {
                        this[hash].instances.push({obj: obj, n: n});
                    }
                    return false;
                }
            },
            // ------ when response comes in, fire all success methods
            set: function (hash, response) {
                if (!this[hash]) {
                    this[hash] = {
                        response: response,
                        instances: []
                    }
                } else {
                    this[hash].response = response;
                    this[hash].received = true;

                    for (var i = 0; i < this[hash].instances.length; i++) {
                        var instance = this[hash].instances[i];
                        var n = instance.n;
                        //SMZ.log("MD_ --",instance.obj.options.selector,instance.obj.textSnippets[n])
                        //SMZ.log("MD_ 360 SMZ.snippets.set",instance.obj.hashCodes[n],instance.obj.textSnippets[n],response )
                        instance.obj.callback(response, instance.n);
                    }
                }
            }
        };


        SMZ.setVisLang = function (data, translateElement) {
            // ------ setting content of translated elements
            var elements = (translateElement) ? $(translateElement) : $('.smz-translated');
            $.each(elements, function (i, el) {
                $(el).html($(el).data(data));
            });
        };

        SMZ.multidoc.service = services[SMZ.multidoc.settings.provider.name];

        if (SMZ.multidoc.settings.provider.name == '' ||
            SMZ.multidoc.settings.provider.url == '' ||
            SMZ.multidoc.settings.provider.key == '') {

            SMZ.multidoc.settings.autotranslateEnabled = 'false';

        } else {
            defaults.maxLength = parseInt(SMZ.multidoc.settings.provider.maxSnippetLength, 10);
            if (isNaN(defaults.maxLength)) {
                defaults.maxLength = 750;
            }

            if (SMZ.multidoc.settings.checkboxLocation === '') {
                SMZ.multidoc.settings.checkboxLocation = defaults.defaultLocation;
            }
            if (SMZ.multidoc.settings.provider.about.indexOf('smz.') === 0) {
                SMZ.multidoc.settings.provider.about = SMZ.multidoc.service.about;
            }

            if (SMZ.multidoc.settings.provider.getTokenActionUrl != '') {
                // todo what if not? 

                var cachedProvider = SMZ.localStorage("SMZ_translation_provider");
                if (cachedProvider.key == SMZ.multidoc.settings.provider.key) {
                    SMZ.multidoc.settings.provider = cachedProvider;
                    SMZ.multidoc.settings.provider.tokenExpires = new Date(cachedProvider.tokenExpires);
                }

                SMZ.log('MD_405 SMZ.multidoc.settings.provider', SMZ.multidoc.settings.provider)

                // serviceQueue for getting token.
                var serviceQueue = $({}), serviceQueueLength = 0;
                var getToken = function (next) {
                    var callback = next;
                    $j.ajax({
                        url: "../" + SMZ.multidoc.settings.provider.getTokenActionUrl,
                        dataType: "json",
                        contentType: "text/plain; charset=utf-8",
                        success: function (response) {
                            SMZ.multidoc.service.parseToken(response);
                            if (callback != undefined) {
                                callback();
                            }
                        },
                        error: function (data, error) {
                            failed = 1;
                            SMZ.log('MD_422 Translate service #### ERROR', error, '####', data, '####');
                        }
                    });
                };

                $.serviceQueue = function (func_) {
                    // Hold the original complete function.
                    var callback = func_;

                    if (serviceQueueLength == 0) {
                        serviceQueueLength++;
                        serviceQueue.queue(getToken);
                        SMZ.log('MD_434 serviceQueue token requested');
                    }


                    serviceQueue.queue(function (next) {
                        callback();
                        next();
                    });
                };
                SMZ.multidoc.translateQueue = [];
                SMZ.log('MD_ initial SERVICE method', SMZ.multidoc.settings.provider.token);
                SMZ.multidoc.service.requestToken(function () {
                    SMZ.log('MD_ initial SERVICE method');
                });


                if (SMZ.multidoc.settings.rememberSettings === 'true') {

                    SMZ.cachedSettings = SMZ.localStorage("SMZ_autotranslate");

                    if (SMZ.cachedSettings.error) {
                        SMZ.cachedSettings = {showTranslation: (SMZ.multidoc.settings.autotranslateDefault == 'true')};
                    }
                } else {
                    SMZ.cachedSettings = {showTranslation: (SMZ.multidoc.settings.autotranslateDefault == 'true')};
                }
            }
        }
    });

    function Plugin(el, options) {
        var _self = this;
        this.element = el;
        this.options = $.extend({}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this.detectTargetLanguage();

        if (SMZ.multidoc.settings.autotranslateEnabled != 'true' &&
            SMZ.multidoc.settings.searchTranslateDefault != 'true') {
            SMZ.log('MD_473 translateEnabled = false');
            return;
        } else {
            SMZ.multidoc.service.requestToken(function () {
                _self.init();
            });
        }
    }

    Plugin.prototype = {

        init: function () {
            //get text to translate. if no text is provided, read out dom value.
            this.originalText = this.getOriginalContent();
            this.strippedText = $('<div>' + this.originalText + '</div>').text();
            if (this.strippedText === "") {
                //SMZ.log('MD_===',this.originalText);
                return;
            }
            //if text is from local storage, locale is also taken from there.
            if(this.options.text && this.options.text == "getFromStorage"){
                this.options.sourceLanguage = SMZ.localStorage("SMZ_rendered_document_lang").locale;
            }

            //SMZ.log('MD_493 all occurances',this.strippedText);
            // prepare element       
            if (this.options.setAttributes) {
                if (!this.prepareElement()) {
                    //SMZ.log('MD_497  field detected',this.strippedText);
                    if (this.errorStop) {
                        return;
                    }
                }
            }

            if (this.options.allowHtml !== true) {
                this.originalText = this.strippedText;
            }
            //start the translation
            this.startTranslation();
        },

        /**
         * get original content of the element.
         * if text is provided through options, use this one.
         */
        getOriginalContent: function () {
            if (this.options.text == null) {
                var target = this.getTargetElement();
                if (target.is('input,textarea')) {
                    return target.val();
                } else {
                    return target.html();
                }
            } else {
                //SMZ.log('MD_524 using provided text _', this.options.text);
                // if "document" (multidoc issue with jivemacros)
                if (this.options.text == "getFromStorage") {
                    var theStorage = SMZ.localStorage("SMZ_rendered_document");
                    return theStorage.markup;
                } else {
                    return this.options.text;
                }
            }
        },

        getIdentifier: function () {
            return (this.options.identifier != null) ? this.options.identifier : $(this.element).attr('id');
        },

        getTargetElement: function () {
            return (this.options.identifier != null) ? $(this.options.identifier) : $(this.element);
        },

        /**
         * prepare the element. TODO jQuery.data(widget, 'color', 'brown');
         */
        prepareElement: function () {
            var translateElement = this.getTargetElement();

            if (translateElement.attr('smz-translated') && translateElement.attr('smz-translated') == "1") {
                //skip translation, already done!
                return false;
            }
            if (translateElement.find("[smz-translated=1]").length > 0) {
                //TODO remove alert later... - 
                SMZ.log('MD_555 ~~~ developer hint ~~~\n\nfound already translated child element.\n\ncheck your jquery selectors and make them unique!\n\ncurrent element: ' + $(this.element).attr('id'), this.element);
                this.errorStop = true; //todo check why
                return false;
            }

            /* element does not need ID
             var autoId = $("[id^='smz-autotranslate-element-']").length+1+"-"+(new Date().getTime());
             if (!translateElement.attr("id")) {
             var id = "smz-autotranslate-element-"+autoId;
             translateElement.attr("id", id);
             }
             */

            translateElement.data('smzTranslateOriginal', translateElement.html());
            translateElement.data('smzTranslateTranslated', translateElement.html());
            translateElement.removeClass('smz-translate');
            translateElement.addClass('smz-translated');

            if (SMZ.cachedSettings.showTranslation === true) {
                SMZ.setVisLang('smzTranslateTranslated', translateElement);
            } else {
                SMZ.setVisLang('smzTranslateOriginal', translateElement);
                translateElement.addClass('loading');
            }
            translateElement.attr('smz-translated', 1);
        },

        /**
         * detect the language of the currently logged in user.
         * if no language div wrapper found, use default language.
         */
        detectTargetLanguage: function () {
            if (this.options.targetLanguage == '') {
                defaults.targetLanguage = this.defaultLanguage;

                if (typeof SMZ != 'undefined' && typeof SMZ.multidoc != 'undefined') {
                    if (SMZ.multidoc.settings.currentUserNativeLanguage != 'null') {
                        defaults.targetLanguage = SMZ.multidoc.settings.currentUserNativeLanguage.substr(0, 2);
                        SMZ.log('MD_593 set target language to »' + defaults.targetLanguage + '«');
                    } else {
                        // if no target language, translation is pointless
                        SMZ.multidoc.settings.autotranslateEnabled = false;
                    }
                }
                this.options.targetLanguage = defaults.targetLanguage;
            }
        },


        /**
         * get textNodes from originaltext
         */
        startTranslation: function () {
            this.translatedText = this.originalText; // copy original text
            this.textSnippets = new Array();
            this.hashCodes = new Array();

            var _self = this;

            //this.DOM = $("<div><div>"+this.originalText+"</div></div>")[0];
            this.DOM = document.createElement('div');
            var innerDiv = document.createElement('div');
            $(innerDiv).html(this.originalText);

            this.DOM.appendChild(innerDiv);
            //SMZ.log("MD_619 this.DOM",this.DOM.innerHTML);
            //SMZ.log("MD_ 620 $",$);

            var tags = this.DOM.getElementsByTagName("*"), nodes;
            for (var t = tags.length; t--;) {
                nodes = tags[t].childNodes;
                for (var n = nodes.length; n--;) {
                    var node = nodes[n];
                    if (node.nodeType === 3) {
                        //SMZ.log("MD_628 node.nodeValue",node.nodeValue);
                        this.shortenTextSnippet(node);
                    }
                }
            }

            //this.sendTranslationRequest();
            if ($(this.element).hasClass('loading') !== true) {
                this.sendTranslationRequest();
            } else {
                SMZ.multidoc.translateQueue.push(this);
                SMZ.multidoc.fireRequests = this.fireRequests;
            }
        },

        /**
         * strip text in suitable parts.
         * TODO: [14.06.13 16:09:15] Sven Kroschwald: nach satzzeichen sollte er nach legitimen anderen zeichen suchen, komma, gedankenstrich, etc
         * TODO: [14.06.13 16:09:21] Sven Kroschwald: erst dann nach leerzeichen
         */
        shortenTextSnippet: function (snippetNode) {
            var _self = this,
                snippet = snippetNode.nodeValue;

            if (snippet.length > 0) {
                var currentString = '',
                    faktor = snippet.length / encodeURIComponent(snippet).length, // encoded snippets are way longer.
                    maxLength = defaults.maxLength * faktor;

                if (snippet.length < maxLength) {
                    currentString = snippet;
                } else {
                    var arr_sentences = snippet.split(/([^.!?;]*[^.!?;\s][.!?;]['"]?)(\s|$)/g);
                    //                var arr_sentences = snippet.match( /[^\.!\?]+[\.!\?]+/g );

                    arr_sentences = (arr_sentences === null) ? [snippet] : arr_sentences;
                    $.each(arr_sentences, function (key, sentence) {
                        if (currentString.length + sentence.length > maxLength) {
                            if (sentence.length > maxLength) {
                                var words = sentence.split(' '),
                                    space = "";
                                $.each(words, function (i, word) {
                                    if (word.length + currentString.length > maxLength) {
                                        _self.addToTranslationQueue($.trim(currentString), snippetNode);
                                        currentString = word;
                                    } else {
                                        currentString += space + word;
                                        space = " ";
                                    }
                                });
                            } else {
                                _self.addToTranslationQueue($.trim(currentString), snippetNode);
                                currentString = sentence;
                            }
                        } else {
                            currentString += sentence;
                        }
                    });
                }
                if ($.trim(currentString).length > 0) {
                    this.addToTranslationQueue($.trim(currentString), snippetNode);
                }
            }
        },

        addToTranslationQueue: function (snippet, node) {
            //SMZ.log('MD_694 addToTranslationQueue #### ## '+snippet.substr(0,54)+"cccccc",node);

            /* see translations.soy => {buildJson($sourceText)} has quotes but need to be enclosed aditionally.*/
            var snippetStripped = (this.options.stripQuotes) ? snippet.replace(/\"/g, '') : snippet;
            snippetStripped = snippetStripped.replace(/\n/g, ' — ');

            var hasAlpha = /[\u00BF-\u1FFF\u2C00-\uD7FF\w]{1,25}/;
            //var hasAlpha = /[a-zA-Z\u0000-\u0080]{1,25}/;
            //var hasAlpha = /[a-zA-Z]{1,25}/;
            //var hasAlpha = /[^\u0000-\u0080]+/;

            if (snippetStripped.match(hasAlpha) && snippetStripped.length > 0) {
                SMZ.log('MD_757 ___ textSnippet. Length: ' + snippetStripped.length + ' ' + snippetStripped.substr(0, 32));// , this)
                this.textSnippets.push(snippetStripped);
                node.nodeValue = node.nodeValue.replace(snippet, "(xxXxx" + this.textSnippets.length + "xxXxx)");
                /*}  else {
                 SMZ.log('MD_710 Ooooooo oo  notalpha '+snippet)*/
            }

        },

        sendTranslationRequest: function () {
            this.translatedText = this.DOM.childNodes[0].innerHTML;
            //SMZ.log('MD_717  sendTranslationRequest ####'+this.translatedText+'## '+this.textSnippets.length);
            for (var iS = 0; iS < this.textSnippets.length; iS++) {
                this.translateTextSnippet(iS);
            }
        },

        // remove entities
        decodeEntities: function (input) {
            var output = $('<div>').html(input).text();
            var y = document.createElement('textarea');
            y.innerHTML = output;
            SMZ.log("MD_ >>>", input);
            SMZ.log("MD_ <<<", output);
            return y.value;
        },

        //hashing 4 caching :)  - no cats will die here.
        hashCode: function (s) {
            var hash = s.split("").reduce(function (a, b) {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a
            }, 0);
            return "callback" + hash.toString().replace("-", "");
        },

        /**
         * send request to Service.
         */
        translateTextSnippet: function (ndx) {
            var _self = this, _ndx = ndx;
            snippet = this.textSnippets[ndx];//'' + this.decodeEntities(this.textSnippets[ndx]),
            requestData = SMZ.multidoc.service.getParams(snippet, this.options);
            requestUrl = SMZ.multidoc.service.getUrl();
            detection = SMZ.multidoc.service.getDetectUrl;
            jsonpCallback = SMZ.multidoc.service.getCallback();
            ifObject = typeof(requestData) == "object";
            hashCode = this.hashCode(snippet + this.options.targetLanguage);
            this.hashCodes[ndx] = hashCode;
            //SMZ.log("MD_ hashCode ", hashCode);

            // ------ this is going to be the callback 
            this.callback = function (response, ndx) {
                var snippet = _self.textSnippets[ndx];

                //TODO error handling...
                if (response != null) {
                    var translatedSnippet = SMZ.multidoc.service.getResult(response, snippet);
                    //SMZ.log('MD_763 Translate service #### OK ####'+translatedSnippet+'## '+ndx,snippet);
                    _self.replaceTranslatedSnippet(translatedSnippet, ndx);
                } else {
                    SMZ.log('MD_766 Translate response NULL #### ERROR ', requestData, ' ####');
                }
                if (_self.options.callback != null) {
                    _self.options.callback();
                }
            };

            var isFirst = SMZ.snippets.add(hashCode, _self, _ndx);
            if (isFirst === false) {
                return false;
            }

            //SMZ.log('MD_778 ajax',this.options,snippet);
            var ajaxObj = {
                url: requestUrl,
                dataType: "jsonp",
                jsonp: jsonpCallback,
                data: requestData,
                processData: ifObject,
                cache: true,
                contentType: "text/plain; charset=utf-8",
                jsonpCallback: hashCode,
                error: function (data, error, msg) {
                    failed = 1;
                    SMZ.log('MD_790 #### ' + error + ' »' + snippet + '«');
                    //SMZ.log('MD_   //'+msg,'  //'+data.status,'  //'+data.statusText);
                    _self.replaceTranslatedSnippet(null, ndx);

                    if (_self.options.callback != null) {
                        _self.options.callback();
                    }
                }
            }
            if (detection) {
                var detectionData = jQuery.extend(true, {}, requestData);
                delete detectionData.from;
                delete detectionData.to;
                //SMZ.log('MD_802 detectionData  //',detectionData);
                $j.ajax({
                    url: detection(),
                    data: detectionData,
                    dataType: "jsonp",
                    cache: true,
                    contentType: "text/plain; charset=utf-8",
                    error: function (data, error, msg) {
                        SMZ.log('MD_810 #### ' + error + ' »' + snippet + '«');
                        SMZ.log('MD_811 ' + msg, '  //' + data.status, '  //' + data.statusText, data);

                        _self.replaceTranslatedSnippet(null, ndx);

                        if (_self.options.callback != null) {
                            _self.options.callback();
                        }
                    },
                    success: function (lang) {
                        //SMZ.log('MD_818 ' +ajaxObj.data.text, lang);
                        if (SMZ.multidoc.service.isLangAvailable(lang, _self.options.targetLanguage)) {
                            ajaxObj.data.from = lang;
                            $j.ajax(ajaxObj);
                        } else {
                            _self.replaceTranslatedSnippet(null, ndx);
                            if (_self.options.callback != null) {
                                _self.options.callback();
                            }
                        }
                    }
                });
            } else {
                $j.ajax(ajaxObj);//TODO Only change here if timeout required. if so, value calculated from loop index from file jquery.smz-translate-auto.js line 193.
            }
        },

        replaceTranslatedSnippet: function (newText, i) {
            if (newText == null) {
                //translation failed
                newText = this.textSnippets[i];
            }
            //decodeEntities not needed?

            //SMZ.log("MD_842 translated text "+" ("+(i+1)+"): ", this.translatedText);
            //SMZ.log('MD_843 translated text '+this.getIdentifier()+" ("+(i+1)+"): ", newText);
            this.translatedText = this.translatedText.replace("(xxXxx" + (i + 1) + "xxXxx)", newText);
            if (this.translatedText.indexOf("(xxXxx") == -1) {
                //SMZ.log("MD_846 replaceTranslatedSnippet",this.translatedText)
                this.setTranslatedContent();
            }
        },

        setTranslatedContent: function () {
            if (this.options.isTiny === true) {
                //content should be placed in RTE
                this.setTinyContent();
                return;
            }

            //detect type of element and set content
            var target = this.getTargetElement();
            if (target.is('input,textarea')) {
                target.val(this.translatedText.replace(/&quot;/g, ''));
            } else {
                if (this.options.allowHtml) {
                    target.html(this.translatedText);
                } else {
                    target.text(this.translatedText);
                }
                target.data('smzTranslateTranslated', target.html())
            }
            target.data('selector', this.options.selector);
            $(this.element).removeClass('loading');
            //SMZ.log('MD_ target.data',target.data())
        },

        fireRequests: function () {
            //TODO This function should be outside of the plugin.
            for (var r = 0; r < SMZ.multidoc.translateQueue.length; r++) {
                var item = SMZ.multidoc.translateQueue[r];
                item.sendTranslationRequest();
            }
        },

        setTinyContent: function () {

            // TODO abort condition, infinite loop?
            if (jive.rte.multiRTE.length == 0) {
                setTimeout(this.setTinyContent, 500);
            } else {
                for (var i = 0; i < jive.rte.multiRTE.length; i++) {
                    if (window.editor.get(jive.rte.multiRTE[i]).isReady()) {

                        //SMZ.log('MD_891 tiny ready... set text: ', this.translatedText);
                        try {
                            tinyMCE.execCommand("mceFocus", null, "wysiwygtext");
                            tinyMCE.activeEditor.setContent(this.translatedText);
                            tinyMCE.execCommand("mceRepaint");
                        } catch (err) {
                            $('#wysiwyg-panel textarea').val(this.translatedText);
                        }
                        // TODO hide loading window or whatever...
                    } else {
                        setTimeout(this.setTinyContent, 500);
                    }
                }
            }
        }

    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);