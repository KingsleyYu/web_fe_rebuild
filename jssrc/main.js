(function() {

    var obj = document.getElementById('requirejs'),
        baseJsUrl =obj&& obj.getAttribute('data-url')?obj.getAttribute('data-url') : '/',
        slot = baseJsUrl.match(/[a-zA-Z]\d/),
        isDebug = 0;
    //获取js路径


    if(slot && slot.length>0){
        slot =  slot[0];
        baseJsUrl = baseJsUrl.match(/http:\/\/[\w\.]*\//)[0];
    }

    function getBaseJsUrl(url){
        return baseJsUrl+url;
    }

    function extend(){
        var arg = arguments,
            a = arg.length == 1 ? lifang : arg[0],
            b = arg.length > 1 ? arg[1] : arg[0];
        if (b == null) return a;
        try {
            for (var n in b) {
                !a.hasOwnProperty(b[n]) && (a[n] = b[n] );
            }
            return a;
        } catch (e) {

        }
    }

    //检查外部是否有配置ajax和tpl的路径，有则覆盖
    if(typeof(window.lifang) !== 'object' ){
        window.lifang = {};
    }

    extend({
        getResourceUrl: function(url){
            var re = baseJsUrl;
            if(slot){
                re+=slot+'/';
            }
            return re+url;
        },
        cacheJs:{},
        isDebug: function(){
            return location.search.match(/debug=true/);
        },
        config: {
            ajaxBaseUrl: ''
        },
        uid:function(){
            return new Date().getTime()+(Math.random()*1e10).toFixed(0);
        },
        loadCss:function(url,opt){
            opt=$.extend({
                type:'text/css',
                rel:'stylesheet'
            },opt||{});
            var l=document.createElement('link');
            $.extend(l,opt);
            l.href=url;
            var h=document.head||document.getElementsByTagName("head")[0]||document.documentElement;
            if (h.firstChild){
                h.insertBefore(l,h.lastChild);
            }else{
                h.appendChild(l);
            }
            return l;
        },
        loadJs:function(url,opt){
            var cacheJs = lifang.cacheJs;
            opt=$.extend({
                type:'text/javascript',
                charset:'utf-8',
                async:false,
                group:'',
                onload:function(){},
                onerror:function(){}
            },opt||{});

            if(cacheJs[url] ){
                opt.onload();
                return ;
            }

            var s=document.createElement('script');
            var t=opt.onload;
            opt.onload=function(){
                t.apply(s,arguments);
                s.onload=s.onreadystatechange=function(){};
            };
            $.extend(s,opt);
            s.onreadystatechange =function(){
                switch (s.readyState){
                    case 'loaded':
                    case 'complete':
                        opt.onload.apply(s,arguments);
                        break;
                    default:
                        break;
                }
            };
            s.src=url;
            cacheJs[url] = true;
            //this._appendToHead(s);

            var h=document.head||document.getElementsByTagName("head")[0]||document.documentElement;
            if (h.firstChild){
                h.insertBefore(s,h.lastChild);
            }else{
                h.appendChild(s);
            }

            return s;
        }
    });
    lifang.config.tplBaseUrl = lifang.isDebug() ? 'wap/lifang/view/':'/wap/lifang/app/view/';
    if (typeof defaultConfig === 'object') {
        for(var item in defaultConfig){
            lifang.config[item] = defaultConfig[item];
        }
    }
    lifang.getAjaxUrl = function(url) {
        return lifang.config.ajaxBaseUrl + url;
    };
    lifang.getTplUrl = function(url) {
        return lifang.config.tplBaseUrl + url;
    };



    var config = {
        paths: {
            jQuery: [
                getBaseJsUrl('lib/jquery-1.11.2.min')
            ],
            highcharts: [
                getBaseJsUrl('lib/highcharts')
            ]
        },
        shim: {
            jQuery: {
                deps: [],
                exports: '$'
            },
            highcharts: {
                deps: ['jQuery'],
                exports: 'highcharts'
            }
        }
    };

    require.config(config);
    if (obj) {
        isDebug = parseInt(obj.getAttribute('debug'), 10) || 0;
        var page = obj.getAttribute('data-page');

        if (isDebug && typeof(page) ==='string' && page!='' ) {
            require([page.indexOf('/')<0?'action/' + page:page]);
        }
    }
})();