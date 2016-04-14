/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1. 项目名称：www.wkzf.com
 2. 页面名称：components/map/line.js(地铁找房功能)
 3. 作者：俞晓晨(yuxiaochen@lifang.com)
 4. 备注：
 -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
define(function() {

    function MapLineController() {
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
         继承于Controller基类
         -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        Controller.call(this);
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    渲染地铁线路下拉数据
	$lineContainer:地铁找房 Select 显示容器
	@cityId:城市Id
	@houseType:房屋类型
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapLineController.prototype.setLine = function($lineSelectContainer, cityId, houseType) {
        var classSelf = this;

        var requestData = {
            'cityId': cityId,
            'houseType': houseType
        };

        //请求接口
        classSelf.request(classSelf.apiUrl.houseMap.getCitySubwayLines, requestData, {
            cache: true,
            process: function(resp) {
                if (resp.data && resp.data.length > 0) {
                    classSelf.renderLineSelectList($lineSelectContainer, resp);
                    classSelf.bindEvents($lineSelectContainer, resp);
                } else {
                    $lineSelectContainer.find('.Selected').html('没有地铁').css('cursor', 'default');
                    $lineSelectContainer.find('.iconfont').hide();
                    $lineSelectContainer.contents('.Dn').html('');
                }
            }
        });
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据下发数据渲染地铁下拉框html
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapLineController.prototype.renderLineSelectList = function($lineSelectContainer, resp) {

        //字符长度,汉字两个长度
        var len = function(s) {
            var l = 0
            if (s) {
                for (var i = 0; i < s.length; i++, l++) {
                    if (s.charCodeAt(i) < 0 || s.charCodeAt(i) > 255) l++;
                };
            };
            return l;
        };

        //长度截取
        var cut = function(s, c, e) {
            if (len(s) > c) {
                if (!e) e = '';
                for (var i = 0, l = 1, t = ''; i < s.length; i++, l++) {
                    if (s.charCodeAt(i) < 0 || s.charCodeAt(i) > 255) l++;
                    if (l > c) {
                        return t + e;
                        break;
                    } else if (l == c) {
                        return t + s.substr(i, 1) + e;
                        break;
                    } else {
                        t += s.substr(i, 1);
                    };
                };
            } else {
                return s;
            }
        };

        var htmlTpl = '<div><b class="Fl">全部</b><b  class="Fr">' + (resp.count || 0) + '套</b></div>';
        var listData = resp.data;

        var count = listData.length + 1;
        if (count < 12) {
            count = 12;
        }

        for (var i = 0; i < listData.length; i++) {
            htmlTpl += '<div data-id="' + listData[i].id + '">';
            htmlTpl += '<b class="Fl">';
            htmlTpl += '<span class="Pr">';
            htmlTpl += '<i class="iconfont" style="color:#' + listData[i].color + '">&#xe611;</i>';
            htmlTpl += '<i style="color:#' + listData[i].color + '">' + cut(listData[i].name, 2) + '</i>';
            htmlTpl += '</span>';
            htmlTpl += '<i>' + cut(listData[i].name, 16, '…') + '</i>';
            htmlTpl += '</b>';

            htmlTpl += '<b  class="Fr">' + (listData[i].count || 0) + '套</b>';
            htmlTpl += '<p><span>';

            for (var s = 0; s < listData[i].subList.length; s++) {
                if (s != 0 && s % (count) == 0) {
                    htmlTpl += '</span><span>';
                }

                htmlTpl += '<i';
                if (s == 0) {
                    htmlTpl += ' class="first"';
                } else if (s == listData[i].subList.length - 1) {
                    htmlTpl += ' class="last"';
                };
                htmlTpl += ' data-sid="' + listData[i].subList[s].id + '" data-lat="' + listData[i].subList[s].lat + '" data-lon="' + listData[i].subList[s].lon + '">' + cut(listData[i].subList[s].name, 16, '…') + '</i>';
            };
            htmlTpl += '</span></p></div>';
        };

        $lineSelectContainer.find('.Selected').html('地铁找房').css('cursor', '');
        $lineSelectContainer.find('.iconfont').show();
        $lineSelectContainer.contents('.Dn').html(htmlTpl);

    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    绑定鼠标Hover 事件+点击事件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapLineController.prototype.bindEvents = function($lineSelectContainer, resp) {
        var $div = $lineSelectContainer.contents('.Dn').contents('div');
        var count = resp.data.length + 1;
        if (count < 12) {
            count = 12;
        }
        var p_height = $div.height() * count;

        //鼠标Hover 事件
        $div.hover(function() {
            /* Stuff to do when the mouse enters the element */
            var _this = $(this);
            var $span = _this.find('p>span');
            _this.contents('p').show().height(p_height).width($span.width() * Math.ceil($span.contents('i').length / count));

        }, function() {
            /* Stuff to do when the mouse leaves the element */
            var $p = $(this).contents('p');
            if (this.t) clearTimeout(this.t);
            this.t = setTimeout(function() {
               $p.hide();
            }, 100)
        });

        //点击事件
        $div.on("click", function(e) {
            var _this = $(this);
            var tagName = (e.target || e.srcElement).tagName;
            var $selectedTitle = _this.parent().siblings('dt').contents('.Selected');


            if (tagName != 'B' && tagName != 'DIV' && tagName != 'I') {
                return false;
            }

            if ($selectedTitle.attr('data-html')) {
                $selectedTitle.attr('data-html', $selectedTitle.html());
            }

            if (_this.attr('data-id')) {
                $selectedTitle.addClass('act');
                $selectedTitle.html(_this.find('.Fl>i').html());
            } else {
                $selectedTitle.removeClass('act');
                $selectedTitle.html($selectedTitle.attr('data-html'));
            }

            $selectedTitle.attr({
                'data-id': _this.attr('data-id') || '',
                'data-sid': '',
                'data-lv': '',
                'data-lat': '',
                'data-lon': 0
            }).click();

            e.stopPropagation();
        });

        $div.find('p>span>i').click(function(e) {
            var _this = $(this);
            var $selectedTitle = _this.parents('.Dn').siblings('dt').contents('.Selected');

            _this.addClass('act').siblings().removeClass('act');
            _this.parents('div').addClass('act').siblings().removeClass('act');

            if (!$selectedTitle.attr('data-html')) {
                $selectedTitle.attr('data-html', $selectedTitle.html());
            }

            $selectedTitle.addClass('act');

            $selectedTitle.html(_this.html()).attr({
                'data-id': _this.parents('div').attr('data-id') || '',
                'data-sid': _this.attr('data-sid'),
                'data-lv': 2,
                'data-lat': _this.attr('data-lat') || '',
                'data-lon': _this.attr('data-lon') || ''
            }).click();

            e.stopPropagation();
        });


        $lineSelectContainer.contents('.Dn').height(p_height);
    }

    return new MapLineController();
});
