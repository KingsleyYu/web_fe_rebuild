/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1. 项目名称：www.wkzf.com
 2. 页面名称：components/map/area.js(地图找房地区展示功能)
 3. 作者：俞晓晨(yuxiaochen@lifang.com)
 4. 备注：
 -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
define(function() {
    function MapAreaController() {

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
         继承于Controller基类
         -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        Controller.call(this);
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    设置地图找房页面区域信息
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapAreaController.prototype.setArea = function($areaContainer, id, houseType) {
        var classSelf = this;
        var $areaListContainer = $areaContainer.find("dd.Dn");
        var requestData = {
            'cityId': id,
            'houseType': houseType
        };


        classSelf.request(this.apiUrl.houseMap.getCityAreasInfo, requestData, {
            process: function(resp) {
                if (resp.data && resp.data.length > 0) {
                    // debugger;
                    classSelf.renderAreaList($areaListContainer, resp);
                    classSelf.bindEvents($areaListContainer);
                }
            }
        });
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据区域数据，生成区域和房源的列表
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapAreaController.prototype.renderAreaList = function($areaListContainer, resp) {
        var $areaSumItem, $areaItem, $subAreaItem, $townItem;
        var listData = resp.data; //列表数据源

        //设置总房源数
        $areaSumItem = $('<div><b class="Fl">全部</b><b class="Fr"></b></div>');
        $areaSumItem.find('b.Fr').html((resp.count || 0) + '套');
        $areaListContainer.append($areaSumItem);

        //生成数据行
        for (var i = 0; i < listData.length; i++) {
            var rowData = listData[i];
            $areaItem = $('<div><b class="Fl"></b><b class="Fr"></b><p></p></div>');
            $areaItem.attr({
                "data-id": rowData.id,
                "data-lat": rowData.lat,
                "data-lon": rowData.lon
            })

            $areaItem.find("b.Fl").html(rowData.name);
            $areaItem.find("b.Fr").html((rowData.count || 0) + '套');

            //是否存在subAreas
            if (rowData.subList && rowData.subList.length > 0) {
                for (var j = 0; j < rowData.subList.length; j++) {
                    var subListRowData = rowData.subList[j];
                    $subAreaItem = $("<span><b></b></span>");
                    $subAreaItem.find('b').html(subListRowData.letter);
                    if (subListRowData.towns && subListRowData.towns.length > 0) {
                        for (var k = 0; k < subListRowData.towns.length; k++) {
                            var townRowData = subListRowData.towns[k];
                            $townItem = $("<i></i>");
                            $townItem.html(townRowData.name).attr({
                                "data-id": townRowData.id,
                                "data-lat": townRowData.lat,
                                "data-lon": townRowData.lon
                            });

                            $subAreaItem.append($townItem);
                        }
                    }
                    $areaItem.find('p').append($subAreaItem);
                }
            }

            $areaListContainer.append($areaItem);
        }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    绑定相关事件
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapAreaController.prototype.bindEvents = function($areaListContainer) {
        var classSelf = this;

        $areaListContainer.find("div").on({
            mouseover: function() {
                var _this = $(this);
                var parent_height = _this.parent().height(); //父元素的高度
                var $townsContainer = _this.find("p");

                $townsContainer.show();

                if ($townsContainer.height() < parent_height) {
                    $townsContainer.height(parent_height);
                }
            },
            mouseout: function() {
                var _this = $(this);
                var $townsContainer = _this.find("p");
                $townsContainer.hide();
            },
            click: function(e) {
                var _this = $(this);
                var $selectedTitle = _this.parent('.Dn').siblings('dt').contents('.Selected');
                var tagName = (e.target || e.srcElement).tagName;

                $(this).addClass('act').siblings().removeClass('act');

                if (tagName != 'B' && tagName != "DIV") {
                    return false;
                }

                //初始状态下不存在data-html 属性，则默认设置为selectedTitle.html()得到的内容，即区域找房
                if (!$selectedTitle.attr("data-html")) {
                    $selectedTitle.attr("data-html", $selectedTitle.html() /*区域找房*/ );
                }

                if (!_this.attr("data-id")) { //只有[全部]这个数据项没有data-id 这个属性
                    $selectedTitle.removeClass('act');
                    $selectedTitle.html($selectedTitle.attr('data-html'));
                } else {
                    $selectedTitle.addClass('act');
                    $selectedTitle.html(_this.find(".Fl").html());
                }

                $selectedTitle.attr({
                    "data-id": _this.attr("data-id"),
                    "data-lv": 1,
                    "data-lat": _this.attr("data-lat") || '',
                    "data-lon": _this.attr("data-lon") || ''
                }).click();

                e.stopPropagation();
            }
        });

        //各个区下面的划片绑定点击事件 
        $areaListContainer.find("p>span>i").on("click", function(e) {
            var _this = $(this);
            var $selectedTitle = _this.parents('.Dn').siblings('dt').contents('.Selected');

            _this.addClass('act').siblings().removeClass('act');
            _this.parents('div').addClass('act').siblings().removeClass('act');

            $selectedTitle.addClass('act');

            //初始状态下不存在data-html 属性，则默认设置为selectedTitle.html()得到的内容，即区域找房
            if (!$selectedTitle.attr("data-html")) {
                $selectedTitle.attr("data-html", $selectedTitle.html() /*区域找房*/ );
            }

            $selectedTitle.attr({
                "data-id": _this.attr("data-id"),
                "data-lv": 2,
                "data-lat": _this.attr("data-lat") || '',
                "data-lon": _this.attr("data-lon") || ''
            }).click();

            e.stopPropagation();
        });
    }

    return new MapAreaController();

});
