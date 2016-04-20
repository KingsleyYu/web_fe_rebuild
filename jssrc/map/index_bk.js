/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1. 项目名称：www.wkzf.com
 2. 页面名称：map/index.js(首页)
 3. 作者：俞晓晨(yuxiaochen@lifang.com)
 4. 备注：
 -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
require(['components/map/area', 'components/map/line', 'components/map/pre'], function(areaFn, lineFn) {
    function IndexController() {
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
         相关全局属性定义
         -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.$area = $('#Area'); //区域找房显示容器dom
        this.$city = $('#City>b'); //顶部城市显示dom
        this.$list = $("#List"); //房源列表显示容器dom
        this.$line = $('#Line'); //地体线路显示容器dom
        this.$frm = $('.main>form.Pre'); //搜索内容块显示dom
        this.$selectLis = $('.Select'); //页面所有select组件的集合
        this.$selectedTitleLis = $('.Select>dt>.Selected'); //页面上所有选中dom集合
        this.$order = $('#Order'); //排序内容显示dom

        this.houseType = $('.main>form.Pre').attr('data-lx'); // 房源类型 
        this.time = 300; //设置定时请求接口的时间
        this.level = [12, 14, 17]; //定义百度地图显示level
        this.data = {}; //持久化所有与后台交互的参数
        this.subway = {}; //持久化已经渲染过的地铁线路数据
        this.hover = []; //持久化行政区域描边数据对象
        this.begin = false; //全局开关，设置是否允许加载百度地图

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
         继承于Controller基类
         -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        Controller.call(this);

        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
         页面加载的时候执行的逻辑
        -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.run();
    }


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    地图初始化的方法
    1. 首先判断是否有传入lat和lon
    2. 获取zoomLv对应的系统显示lv，可能的值为 0:区县级别。 1:区县下的道路或者街道级别; 2:小区级别
    3. 判断地图的拖动的范围是不是前一次可视区域的30%之内，如果是，就无需请求数据
    4. 获取可视区域30%之外的屏幕坐标，构造请求数据，获取房源数据
    5. 根据下发数据中的cityId,与当前的cityId进行比较，如果不一致，则需要重新绘制areaSelect 和 LineSelect 
    6. 清除覆盖物
    7. 如果没有房源数据，则提示
    8. 循环遍历，打点去重。如果不是重复，打点(setLabel).

    参数：
    @zoomLv:地图缩放级别
    @lat:纬度
    @lon:经度
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.init = function(zoomLv, lon, lat) {
        var classSelf = this;

        var bs = classSelf.bounds(); //获取当前可视区域的屏幕坐标

        //判断是否有传入坐标参数和缩放级别，则以该坐标为中心点，并缩放到对应的级别,之后再重新渲染地图
        if (lon && lat) {
            classSelf.begin = false;
            zoomLv = zoomLv || classSelf.map.getZoom();
            classSelf.map.centerAndZoom(new BMap.Point(lon, lat), zoomLv);
            setTimeout(function() {
                classSelf.init();
            }, classSelf.time);

            return;
        }

        var lv = this.getLevel(zoomLv); //根据缩放级别获取系统对应的级别

        //满足 1. 当前地图的显示级别==上次请求的显示级别
        //     2. 地图的拖动范围未超出在上次显示的区域的30%的范围
        // 则不需要重新请求数据打点
        if (lv == classSelf.data.level && bs.minLon > classSelf.data.minLon && classSelf.data.maxLon > bs.maxLon && bs.minLat > classSelf.data.minLat && classSelf.data.maxLat > bs.maxLat) {
            //console.log('在中心点'+(pd*100)+'%'+'范围内移动.');
            return;
        }

        var requestData = $.extend({
            'houseType': classSelf.houseType,
            'level': lv
        }, classSelf.bounds(0.3));

        //地图打点去重，返回1，表示这个点在可是范围内房源数量没有变化，不需要重新渲染
        //如果房源数量有变化，就直接删了，之后重新打点
        var lab = function(d) {
            var p = classSelf.map.getOverlays();
            for (var i = p.length - 1; i >= 0; i--) {
                if (p[i].key) {
                    var pi = p[i].getPosition();
                    if (pi.lat == d.lat && pi.lng == d.lon) {
                        if (p[i].key == d.key && p[i].count == d.count) {
                            return 1;
                        } else {
                            classSelf.map.removeOverlay(p[i]);
                            return;
                        }
                        break;
                    };
                }
            }
        };

        classSelf.tips('正在加载房源...', 1);

        //继承售价，户型，面积，特色 4个筛选条件的值
        requestData = $.extend(requestData, classSelf.genSelect());

        console.log("init requestData:" + window.JSON.stringify(requestData));
        debugger;

        //请求ajax 获取打点需要基础数据
        classSelf.request(classSelf.apiUrl.houseMap.querySellListOnMap, requestData, {
            process: function(resp) {
                if (!resp.data) {
                    return;
                }

                var cityId = resp.data.cityId;
                var housesRecords = resp.data.records; //房源数数据

                //判断是否需要请求区域和地铁数据
                if (cityId && cityId != classSelf.$frm.attr("data-id")) {
                    //debugger;
                    classSelf.$city.text(resp.data.cityName);
                    classSelf.$frm.attr("data-id", cityId);

                    //设置区域数据显示
                    areaFn.setArea(classSelf.$area, cityId, classSelf.houseType);

                    //设置地铁下拉数据显示
                    lineFn.setLine(classSelf.$line, cityId, classSelf.houseType);
                }

                //清除覆盖物
                classSelf.clear();

                if (!housesRecords || housesRecords.length == 0) {
                    classSelf.tips("可视区域没有找到房源...");
                    return;
                }

                //classSelf.tips(); //issues
                classSelf.data = requestData; // 持久化每次与后端交互的请求数据

                for (var i = 0; i < housesRecords.length; i++) {
                    var houseRowData = housesRecords[i];
                    var labelContent = ""; //百度Label content
                    //地图打点判断是否重复，不重复则需要重新打点
                    if (!lab(houseRowData)) {
                        if (lv === 0) {
                            if (houseRowData.count > 9999) {
                                labelContent = '<p class="lv0">' + houseRowData.value + '<i>' + Math.round(houseRowData.count / 1000) / 10 + '万' + '</i></p>';
                            } else {
                                labelContent = '<p class="lv0">' + houseRowData.value + '<i>' + houseRowData.count + '</i></p>';
                            }
                        } else if (lv === 1) {
                            labelContent = '<p class="lv1"><b>' + houseRowData.count + '</b><i class="l"></i><i>' + houseRowData.value + '</i><i class="r"></i></p>';
                        } else if (lv === 2) {
                            labelContent = '<p class="lv2';

                            if (classSelf.$list.attr('data-type') == 5 && houseRowData.key === classSelf.$list.attr('data-id')) {
                                labelContent += ' over vis';
                            }

                            labelContent += '"><i class="l"></i><i>' + houseRowData.count + '</i><i class="r"></i><i class="h">' + houseRowData.value + '</i><i class="v"></i></p>';
                        }

                        //打点并给点绑定相关事件
                        classSelf.setLabel(lv, houseRowData.lon, houseRowData.lat, labelContent, houseRowData.key, houseRowData.count);
                    }
                }
            }
        });
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    百度地图Label添加事件绑定

    1. 鼠标悬停 调用 setHover 绘制描边
    2. 鼠标离开 移除页面所有的描边
    3. 点击事件；a. lv===2(点击小区级别)，替换当前打点的class,并重新渲染房源列表
                 b. lv<2,以当前点为中心，重新渲染地图；渲染改级别下的房源列表

    参数定义：
    @lv:level
    @lon:经度
    @lat:纬度
    @content:打点内容
    @key:每个打点的key
    @count:打点显示的房源的数量
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setLabel = function(lv, lon, lat, content, key, count) {
        var classSelf = this;

        //定义百度Label
        var baiduLabel = new BMap.Label(content, {
            position: new BMap.Point(lon, lat)
        });

        baiduLabel.key = key; //数据Id
        baiduLabel.count = count; //房源数量

        baiduLabel.setStyle({
            border: 0,
            background: '',
            padding: 0
        });
        baiduLabel.setZIndex(2)

        classSelf.map.addOverlay(baiduLabel);

        //鼠标移入，绘制板块描边
        baiduLabel.addEventListener('mouseover', function() {
            if (!/(class=\"lv\d over)/i.test(this.getContent())) this.setStyle({
                zIndex: 8
            });

            classSelf.setHover(this);
        });

        //鼠标移出，移除板块描边
        baiduLabel.addEventListener('mouseout', function() {
            if (!/(class=\"lv2 over)/i.test(this.getContent())) this.setStyle({
                zIndex: 2
            })

            //清除所有hover的描边
            for (var i = classSelf.hover.length - 1; i >= 0; i--) {
                classSelf.map.removeOverlay(classSelf.hover[i]);
            };
        });

        baiduLabel.addEventListener('click', function() {
            classSelf.begin = false; //设置不允许加载地图

            if (lv === 2 /*小区级别*/ ) {
                var labelContent = this.getContent();

                //替换显示内容，加上 over vis css 类
                this.setContent(labelContent.replace(/(class=\"lv\d)\"/i, '$1 over vis"'));
                this.setStyle({
                    zIndex: 7
                });

                classSelf.setList(5 /*小区级别*/ , this.key, labelContent.replace(/^.*<i class=\"h\"\>([^<]*)<\/i>.*$/i, '$1'));
            } else {
                classSelf.setList(lv + 1, this.key);
                classSelf.map.centerAndZoom(this.getPosition(), classSelf.level[lv + 1]);

                //重新渲染地图
                setTimeout(function() {
                    classSelf.init();
                }, classSelf.time)
            }
        });
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
       Label覆盖物鼠标移入绘制描边

       判断悬停区域是否保存对应的描边数据
       a.area.hover==false：表示该覆盖物没有可用绘制描边的数据
       b.area.hover==true：表示覆盖物已经缓存了绘制描边的数据，直接取出调用addOverlay即可
       c.area.hover==undefined：表示需要请求接口地址获取描边数据

       @area:鼠标悬停的Label
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setHover = function(area) {
        var classSelf = this;
        if (area.hover == false) {
            return;
        } else if (area.hover) {
            classSelf.map.addOverlay(area.hover);
        } else {
            var lv = classSelf.getLevel();
            var grade = 4; /*默认grade 为行政区级别*/
            if (lv == 2) {
                grade = 6 /*小区级别*/ ;
            } else if (lv == 1) {
                grade = 5 /*区以下的道路级别*/ ;
            }

            classSelf.request(classSelf.apiUrl.houseMap.getStrokeGps, {
                'key': area.key,
                'grade': grade
            }, {
                cache: true,
                process: function(resp) {
                    var d = resp.data;
                    if (!d || d.length == 0) return;
                    var p = [];
                    for (var i = d.length - 1; i >= 0; i--) {
                        p.push(new BMap.Point(d[i].lon, d[i].lat));
                    };
                    if (p.length > 0) {
                        area.hover = new BMap.Polygon(p, {
                            strokeWeight: 4,
                            strokeColor: '#ffa200',
                            fillColor: '#333',
                            fillOpacity: 0.05,
                            strokeOpacity: 0.85,
                            enableClicking: false
                        });
                        classSelf.map.addOverlay(area.hover);

                        //记录描边数据
                        classSelf.hover.push(area.hover);
                    } else {
                        //设置该覆盖物没有对应的描边数据，避免重复请求
                        area.hover = false;
                    }
                }
            });
        }
    }


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    生成房源数据的List并初始相关事件
    1. 设置列表div的data-x 属性
    2. 定义一个data对象，通过type判断列表显示类型，并写入到data里，data继承筛选条件 
       data=$.extend(data,classSelf.genSelect());
    3. ajax 请求mapSearch.rest。下发结果根据type 区分渲染，
       type=5的时候，表示是房源列表了，则点击直接跳转至房源详情页面
    4. 设置列表hover效果，根据板块id查找地图上的点，找到对应的点，执行setHover;
       如果是地铁房源，还需要执行setCircle这个方法，画地铁范围
    5. 点击列表，根据data-x 参数执行init方法，重新渲染地图   

    参数定义：
    @type:类型
    @id:板块Id或地铁站id
    @sub:小区名称或者地铁站Id
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setList = function(type, id, sub) {
        var classSelf = this;

        //请求数据
        var requestData = {
            'cityId': classSelf.$frm.attr('data-id'),
            'houseType': classSelf.houseType,
            'type': type
        };

        //定义当没有数据时，页面交互函数
        var noDataFun = function() {
            classSelf.$list.html('<p class="err">很抱歉,没有找到相匹配的房源,请重新搜索~ <a href="javascript:location.reload()"><i class="iconfont">&#xe612;</i>清空筛选</a><p>').css('border-width', 1).show();
            classSelf.$order.html('').hide();
            classSelf.setHeight();
        };

        //显示筛选条件栏
        $('.main>.Select').show();

        if (type === 0) {
            noDataFun();
            return;
        }

        //设置列表div的data-x 属性
        if (type && id) {
            classSelf.$list.attr({
                'data-type': type,
                'data-id': id,
                'data-sub': sub
            });
        } else if (!type && !id) {
            type = classSelf.$list.attr('data-type');
            id = classSelf.$list.attr('data-id');
            sub = classSelf.$list.attr('data-sub');

            requestData.type = type;
        }

        if (id && type) {
            if (type == 1 /*按区县级找房*/ ) {
                requestData.districtId = id;
            } else if (type == 2 /*按街道级找房*/ ) {
                requestData.townId = id;
            } else if (type == 3 /*按地铁线路*/ ) {
                requestData.subWayLineId = id;
            } else if (type == 4 /*按地铁站找房*/ ) {
                requestData.subWayLineId = id;
                requestData.subWayLineStationId = sub;
            } else if (type == 5 /*按指定小区找房*/ ) {
                requestData.subEstateId = id;
            }
        } else {
            classSelf.$selectedTitleLis.parents('.main>.Select').hide();
            classSelf.$list.html('').hide();
            classSelf.setHeight();
            return;
        }


        //设置requestdata继承售价，户型，面积，特色4个筛选条件
        requestData = $.extend(requestData, classSelf.genSelect());

        //是否有排序条件
        if (classSelf.$list.attr('data-order')) {
            requestData.orderType = classSelf.$list.attr('data-order');
        }

        //ajax 请求mapSearch.rest
        classSelf.request(this.apiUrl.houseMap.mapSearch, requestData, {
            process: function(resp) {
                var htmlTpl;
                var dataLis = resp.data;

                if (!resp.data || resp.data.length == 0) {
                    noDataFun();
                    return;
                }

                if (type == 5 /*按小区级别找房*/ ) {
                    requestData.orderType = requestData.orderType || 0;

                    //判断是否存在排序显示容器,不存在添加一个
                    if (classSelf.$order.length == 0) {
                        classSelf.initSortContainer(sub, requestData.orderType);
                    }

                    //render渲染小区房源列表
                    htmlTpl = '<ul>';
                    for (var i = 0; i < dataLis.length; i++) {
                        var rowData = dataLis[i];

                        htmlTpl += '<li><a href="/' + rowData.houseIdUrl + '" target="_blank"><img src="' + rowData.houseListImgUrl + '"">'

                        //是否有视频
                        if (rowData.videoHouse) {
                            htmlTpl += '<i class="video"></i>';
                        }

                        if (rowData.topHouse) {
                            htmlTpl += '<i class="top">精选</i>';
                        }

                        if (rowData.industrySole) {
                            htmlTpl += '<i class="sole">独家</i>';
                        }

                        htmlTpl += '<span><b>' + rowData.houseChild + '</b><em>' + rowData.area + 'm²';

                        if (rowData.floor && rowData.floor != '--') {
                            htmlTpl += '<i>' + rowData.floor + '</i>';
                        }

                        if (rowData.subwayList) {
                            rowData.subwayList.length = 2;
                        }

                        if (rowData.subwayList && rowData.subwayList.length) {
                            htmlTpl += '<i>' + rowData.subwayList.join(' ') + '</i>';
                        }

                        htmlTpl += '</em>';

                        if (rowData.isFiveYearAndOnlyOne) {
                            htmlTpl += '<i class="m5">满五唯一</i>';
                        }

                        if (rowData.isTwoYear) {
                            htmlTpl += '<i class="m2">满二</i>';
                        }

                        if (rowData.industrySole) {
                            htmlTpl += '<i class="sole">独家</i>';
                        }

                        if (rowData.isSubwayHouse) {
                            htmlTpl += '<i class="subway">地铁</i>';
                        }

                        htmlTpl += '</span><b class="total">' + rowData.totalPrice + '万</b></a></li>';
                    };

                    htmlTpl += '</ul>';

                    //获取页面上所有的覆盖物集合
                    var overLaysList = classSelf.map.getOverlays();
                    //循环遍历，找出当前小区对应的覆盖物，并加上 over vis 样式
                    for (var i = overLaysList.length - 1; i >= 0; i--) {
                        var tmpOverLay = overLaysList[i];
                        if (tmpOverLay.key) {
                            if (tmpOverLay.key == id) {
                                tmpOverLay.setContent(tmpOverLay.getContent().replace(/(class=\"lv\d)(\s+vis)?(\s+over)?\"/i, '$1 over vis"'));
                                tmpOverLay.setStyle({
                                    zIndex: 7
                                });
                            } else {
                                tmpOverLay.setContent(tmpOverLay.getContent().replace(/(class=\"lv\d) over/i, '$1'));
                                tmpOverLay.setStyle({
                                    zIndex: 2
                                });
                            }
                        }
                    };

                    classSelf.$list.html(htmlTpl).css('border-width', 0).show();
                    classSelf.setHeight();
                } else {
                    //清空排序字段内容并隐藏
                    classSelf.$order.html('').hide();

                    htmlTpl = '<h3>共 ' + resp.count + ' 个相关房源</h3>';

                    for (var i = 0; i < dataLis.length; i++) {
                        var tmpData = dataLis[i];
                        htmlTpl += '<dl data-id="' + tmpData.key + '" data-lon="' + tmpData.lon + '" data-lat="' + tmpData.lat + '"><dt>' + tmpData.value + '</dt><dd>' + tmpData.count + ' 套 <i>&gt;</i></dd></dl>';
                    };

                    classSelf.$list.html(htmlTpl).css('border-width', '1').show();

                    //绑定事件
                    classSelf.$list.contents('dl').on('click', function() {
                        var _this = $(this);

                        var id = _this.attr('data-id');
                        var lon = _this.attr('data-lon');
                        var lat = _this.attr('data-lat');

                        //判断全局有没有百度图像标注对象
                        if (classSelf.mark) {
                            classSelf.map.removeOverlay(classSelf.mark);
                        }

                        if (type == 1) {
                            classSelf.setList(2, id);
                            debugger;
                            classSelf.init(classSelf.level[2], lon, lat);
                        } else if (type == 3) {
                            classSelf.setList(4, classSelf.$line.find('.Selected').attr('data-id'), id);
                            classSelf.setCircle(lon, lat);
                            classSelf.init(16, lon, lat);
                        } else if (type == 2 || type == 4) {
                            classSelf.setList(5, id, _this.contents('dt').html());
                            if (classSelf.getLevel() == 2) {
                                //更改地图的中心点，地图会平滑到该坐标
                                classSelf.map.panTo(new BMap.Point(lon, lat));

                                //重现渲染地图
                                setTimeout(function() {
                                    classSelf.init()
                                }, classSelf.time);

                            } else {
                                classSelf.init(classSelf.level[2], lon, lat);
                            };
                        }
                    });

                    //定义鼠标hover事件
                    classSelf.$list.contents('dl').hover(function() {
                        /* Stuff to do when the mouse enters the element */
                        var _this = $(this);
                        var id = _this.attr('data-id');
                        var lon = _this.attr('data-lon');
                        var lat = _this.attr('data-lat');

                        //获取页面所有的覆盖物
                        var overLayList = classSelf.map.getOverlays();

                        //循环遍历，找到对应的覆盖物，并设置板块描边
                        for (var i = overLayList.length - 1; i >= 0; i--) {
                            var tmpOverLay = overLayList[i];
                            if (tmpOverLay.key === id) {
                                var pi = tmpOverLay.getPosition();
                                if (pi.lat == lat && pi.lng == lon) {
                                    classSelf.setHover(tmpOverLay);
                                    tmpOverLay.setContent(tmpOverLay.getContent().replace(/(class=\"lv\d)/i, '$1 over'));
                                    tmpOverLay.setStyle({
                                        zIndex: 8
                                    });
                                    break;
                                }
                            }
                        }
                    }, function() {
                        /* Stuff to do when the mouse leaves the element */
                        var _this = $(this);

                        //获取页面所有的覆盖物
                        var overLayList = classSelf.map.getOverlays();

                        for (var i = overLayList.length - 1; i >= 0; i--) {
                            var tmpOverLay = overLayList[i];
                            if (tmpOverLay.key === _this.attr('data-id')) {
                                tmpOverLay.setContent(tmpOverLay.getContent().replace(/(class=\"lv\d) over/i, '$1'));
                                tmpOverLay.setStyle({
                                    zIndex: 2
                                });
                            }
                        }

                        //去除页面所有描边
                        for (var i = classSelf.hover.length - 1; i >= 0; i--) {
                            classSelf.map.removeOverlay(classSelf.hover[i]);
                        }
                    });

                    classSelf.setHeight();
                }
            },
            onExceptionInterface: function() {
                noDataFun();
            },
            onErrorInterface: function() {
                noDataFun();
            }
        });
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    初始化排序显示容器
    @communityName:小区名
    @orderType:当前页面筛选条件
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.initSortContainer = function(communityName, orderType) {
        var classSelf = this;

        //定义sortContainer
        classSelf.$order = $('<div id="Order"></div>').insertBefore(classSelf.$list);

        //添加显示小区名的title
        classSelf.$order.html('<h3 class="Fl">' + communityName + '</h3>');

        //添加支持的排序类型
        var $sortTypeContainer = $('<p class="Fr"></p>');
        $sortTypeContainer.append('<b class="order" data-value="0">默认</b>'); //默认排序
        $sortTypeContainer.append('<b class="order" data-value="1">价格<i>&uarr;</i></b>'); //价格排序
        $sortTypeContainer.append('<b class="order" data-value="3">面积<i>&uarr;</i></b>'); //面积排序
        $sortTypeContainer.append('<b class="order" data-value="5">最新<i>&uarr;</i></b>'); //最新排序

        classSelf.$order.append($sortTypeContainer).show();

        //排序类型绑定点击事件
        classSelf.$order.find('>.Fr>b').on("click", function() {
            var _this = $(this);
            var $i = _this.contents('i');

            _this.siblings('.order.act').removeClass('act').contents('i').html('&uarr;');

            if ($i.length == 0) {
                classSelf.$list.attr('data-order', _this.attr('data-value'));
            } else {
                if ($i.html() == '&uarr;' || $i.html() == '↑') {
                    $i.html('&darr;');
                    classSelf.$list.attr('data-order', parseInt(_this.attr('data-value') + 1));
                } else {
                    $i.html('&darr;');
                    classSelf.$list.attr('data-order', _this.attr('data-value'));
                }
            }

            _this.addClass('act');
            classSelf.setList();
            return false;
        });

        //如果当前已有排序条件，初始相应元素的样式和显示内容
        classSelf.$order.find('>.Fr>b').each(function(index, el) {
            var $el = $(el);
            var sortType = parseInt($el.attr('data-value'));

            if (orderType == sortType) {
                $el.addClass('act');
            } else if (orderType == sortType + 1) {
                $el.addClass('act').contents('i').html('&darr;');
            }
        });
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    页面加载的时候执行的逻辑
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.run = function() {
        var classSelf = this;

        //初始化地图容器随页面交互变化高度方法
        $(window).resize(function() {
            classSelf.setHeight()
        });
        classSelf.setHeight();

        //初始百度地图相关设置

        classSelf.map = new BMap.Map('Map', {
            enableMapClick: false
        });

        classSelf.map.centerAndZoom(classSelf.$city.text(), classSelf.level[0]); //地图定位到当前城市
        classSelf.map.addEventListener('load', function() { //地图加载完成
            classSelf.map.setMinZoom(9); //设置地图允许的最小级别。取值不得小于地图类型所允许的最小级别
            classSelf.map.enableScrollWheelZoom(); //启用滚轮放大缩小
            classSelf.map.disableDoubleClickZoom(); //禁止双击放大
            classSelf.map.disableInertialDragging(); //禁用地图惯性拖拽

            //添加比例尺控件
            classSelf.map.addControl(new BMap.ScaleControl({
                anchor: BMAP_ANCHOR_BOTTOM_LEFT
            }));

            //添加默认缩放平移控件
            classSelf.map.addControl(new BMap.NavigationControl({
                anchor: BMAP_ANCHOR_BOTTOM_RIGHT
            }));

            //设置Navigation平移按钮点击结束事件
            classSelf.map.addEventListener("moveend", function() {                                
                classSelf.begin = true;                
                setTimeout(function() {                    
                    classSelf.init();                
                }, classSelf.time);            
            });

            //设置百度地图缩放开始     
            classSelf.map.addEventListener('zoomstart', function() {
                classSelf.begin = true
            });

            //缩放结束
            classSelf.map.addEventListener('zoomend', function() {
                if (classSelf.begin) setTimeout(function() {
                    classSelf.init();
                }, classSelf.time)
            });

            //鼠标拖动结束
            classSelf.map.addEventListener('dragend', function() {
                classSelf.begin = true;
                setTimeout(function() {
                    classSelf.init();
                }, classSelf.time);
            });
            classSelf.init();
        });

        //表单添加事件绑定
        classSelf.addListenerToFrm();

        //页面所有select 组件添加事件绑定
        classSelf.addListenerToSelect();

        //区域找房添加事件绑定
        classSelf.addListenerToAreaSelect();

        //地铁找房添加事件绑定
        classSelf.addListenerToLineSelect()
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    动态设置地图展示的高度
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setHeight = function() {
        var classSelf = this;
        var $baiduMap = $('#Map');
        var b_height = $(window).height() - $baiduMap.offset().top;

        $baiduMap.height(b_height);
        b_height = b_height - classSelf.$list.offset().top + 60;
        classSelf.$list.height('');
        if (classSelf.$list.height() > b_height) {
            classSelf.$list.height(b_height);
        }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    地图找房Form提交事件
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.addListenerToFrm = function() {
        var classSelf = this;

        //定义表单体检事件
        classSelf.$frm.submit(function() {
            /* Act on the event */
            var _this = $(this);
            var key = _this.contents('input:text').val().replace(/(^\s*|(\s*$))/i, '');

            //如果有地图标注，则去除
            if (classSelf.mark) {
                classSelf.map.removeOverlay(classSelf.mark);
            }

            //重置区域找房和地铁找房的筛选条件
            classSelf.$area.rest();
            classSelf.$area.rest();

            if (key) {
                classSelf.request(classSelf.apiUrl.houseMap.searchByKeyword, {
                    "cityId": _this.attr('data-id'),
                    "houseType": classSelf.houseType,
                    "key": key
                }, {
                    process: function(resp) {
                        var result = resp.data;
                        if (result) {
                            if (result.type == 4 /*按地铁站*/ ) {
                                classSelf.setList(4, classSelf.$line.find('.Selected').attr('data-id'), result.id);
                                classSelf.init(classSelf.level[2], result.lon, result.lat);
                            } else if (result.type == 5 /*按小区*/ ) {
                                classSelf.setList(5, result.id, key);
                                classSelf.init(classSelf.level[2], result.lon, result.lat);
                            } else {
                                classSelf.setList(result.type, result.id);
                                if (classSelf.type == 2 /*按道路或街道*/ ) {
                                    classSelf.init(classSelf.level[2], result.lon, result.lat);
                                } else {
                                    classSelf.init(classSelf.level[1], result.lon, result.lat);
                                }
                            }
                        } else { //如果没有查询结果，则用百度搜索
                            var baiduSearch = new BMap.LocalSearch(classSelf.$city.text(), {
                                onSearchComplete: function(r) {
                                    classSelf.setList(0);
                                    if (r.getNumPois() > 0) {
                                        classSelf.mark = r.getPoi(0).point;
                                        classSelf.begin = false;
                                        classSelf.map.centerAndZoom(classSelf.mark, classSelf.level[2]);
                                        classSelf.mark = new BMap.Marker(classSelf.mark);
                                        classSelf.map.addOverlay(classSelf.mark); //图标
                                        setTimeout(function() {
                                            classSelf.init()
                                        }, classSelf.time);
                                    } else {
                                        classSelf.tips('未找到该地址,请重新搜索!');
                                    };
                                }
                            })
                            baiduSearch.search(key);
                        }
                    }
                });
            } else { //没有关键字，提交页面就刷新
                location.reload();
            }
        });

        //定义Form内容重置方法,主要用于清空表单内的输入内容
        classSelf.$frm.rest = function() {
            classSelf.$frm.contents('input:text').val('');
        }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    区域找房相关事件绑定
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.addListenerToAreaSelect = function() {
        var classSelf = this;

        classSelf.$area.find('.Selected').mousemove(function() {
            //隐藏表单autocomplete 内容
            classSelf.$frm.contents('.Pa').hide();
        }).unbind('click').click(function() {
            console.log("addListenToArea click");

            var _this = $(this);
            var id = _this.attr("data-id");
            var lv = _this.attr("data-lv");

            if (classSelf.mark) {
                classSelf.map.removeOverlay(classSelf.mark);
            }

            if (id) {
                classSelf.$frm.rest();
                classSelf.$line.rest();
                classSelf.setList(lv, id);
                classSelf.init(classSelf.level[lv], _this.attr('data-lon'), _this.attr('data-lat'));
            } else {
                //classSelf.deft();
                location.reload();
            }

            //隐藏下拉框
            _this.parent().siblings('.Dn').hide();

            return false;
        });

        //定义区域信息Select组件选项重置方法
        classSelf.$area.rest = function() {
            var $selectArea = classSelf.$area.find('.Selected');

            $selectArea.html($selectArea.attr('data-html')).attr('data-id', '');
            classSelf.$area.find('.act').removeClass('act');
        }
    }


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    初始Line Select 组件相关事件
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.addListenerToLineSelect = function() {
        var classSelf = this;

        classSelf.$line.find('.Selected').unbind('click').click(function() {
            var _this = $(this);
            var id = _this.attr('data-id');
            var lv = _this.attr('data-lv');
            var sid = _this.attr('data-sid');
            var lat = _this.attr('data-lat');
            var lon = _this.attr('data-lon');

            //如果没有地铁线路，直接return
            if (classSelf.$line.contents('.Dn').html() == '') return;

            //如存在地图标注，则清除
            if (classSelf.mark) {
                classSelf.map.removeOverlay(classSelf.mark);
            }

            //重置表单和区域选择
            classSelf.$frm.rest();
            classSelf.$area.rest();

            if (id) {
                if (lv && sid) {
                    classSelf.setList(4, id, sid);
                    classSelf.setSubway(id, sid);
                    classSelf.init(16 /*地铁站级别*/ , lon, lat);
                } else {
                    classSelf.setList(3, id);
                    classSelf.setSubway(id);
                };
            } else {
                //刷新页面
                location.reload();
            };

            //隐藏下拉的地铁数据
            _this.parent().siblings('.Dn').hide();
        });

        //地铁选择组件添加rest方法
        classSelf.$line.rest = function() {
            var $selectLine = classSelf.$line.find('.Selected');

            $selectLine.html($selectLine.attr('data-html')).attr('data-id', '');
            classSelf.$line.find('.act').removeClass('act');
        }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义页面所有含有.Select 元素的点击事件处理逻辑
    1. 区域找房 和 地铁找房 
    2. 售价，户型，面积，特色 筛选条件
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.addListenerToSelect = function() {
        var classSelf = this;

        //给每个Select 组件的选中头定义点击事件
        classSelf.$selectedTitleLis.on("click", function() {
            classSelf.data = {}; //清空与后台的交互数据
            var lid = classSelf.$line.find('.Selected').attr('data-id');

            //如果是存在选择地铁线路
            if (lid) {
                classSelf.setSubway(lid, classSelf.$line.find('.Selected').attr('data-sid'));
            }

            //重新渲染房源数据列表
            classSelf.setList();

            //重新获取数据渲染地图
            classSelf.init();
        });

        //定义鼠标悬停和离开事件
        classSelf.$selectLis.hover(function() {
            var _this = $(this);
            var $dn = _this.contents('.Dn');

            if ($dn.html() != '') {
                $dn.show();
            }
        }, function() {
            var _this = $(this);
            var $dn = _this.contents('.Dn');
            $dn.hide(200);
        })

        //定义Select 中下拉选项的点击事件
        classSelf.$selectLis.find(".Dn>i").click(function(event) {
            var _this = $(this);
            var $dn = _this.parent();
            var $selectedTitle = $dn.siblings('dt').contents('.Selected');

            _this.addClass('act').siblings().removeClass('act');

            if (!$selectedTitle.attr('data-html')) {
                $selectedTitle.attr('data-html', $selectedTitle.html());
            }

            if (_this.attr('data-value') && _this.attr('data-value') != '0') {
                $selectedTitle.html(_this.html());
                $selectedTitle.addClass('act');
            } else {
                $selectedTitle.removeClass('act');
                $selectedTitle.html($selectedTitle.attr('data-html'));
            }

            //触发Select 选中头的点击
            $selectedTitle.attr('data-value', _this.attr('data-value')).click();

            $dn.hide();

            //return false;
        });
    }


    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    清除地图覆盖物
    1. 获得地图当前的缩放级别
    2. 获取地图上所有的覆盖物
    3. 获取两倍屏的可视区域的屏幕坐标
    4. 获取当前选中的地铁的LineId
    5. 循环遍历覆盖物集合，清除覆盖物(不包括地铁画圈circle和圈上的remark)，分两种情况
        a. 对于存在key和房源数量自定属性的覆盖物且地图缩放级别没有变化，如果覆盖物超出以当前可视区域放大
           一倍的可视区域，则可以删除该覆盖物
        b. 对于不具有自定义属性的覆盖物或者缩放级别存在变化时，删除对应覆盖物(除由于关键字搜索没有结果生成的图标标注覆盖物)
            比如删除区域绘制的描边
            比如当缩放级别从区县级别切换到下一级别，需要将原先区县级别的打点全部清除

    6. 当前缩放级别还未到小区级别，需要将与地铁相关的Circle覆盖物和上面remark覆盖物清除
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.clear = function() {
        var classSelf = this;

        var lv = classSelf.getLevel();
        var p = classSelf.map.getOverlays();
        var lid = classSelf.$line.find('.Selected').attr('data-id'); //当前选中的地铁线路Id
        var bs = classSelf.bounds(1); //两倍屏清除点

        // var del_Points = new Array();
        // var myGeo = new BMap.Geocoder();

        for (var i = p.length - 1; i >= 0; i--) {
            if (!p[i].lid || p[i].lid != lid) {
                if (p[i].key && p[i].count && lv === classSelf.data.level) {
                    var lon = p[i].getPosition().lng,
                        lat = p[i].getPosition().lat;
                    if ((lon > bs.maxLon || lon < bs.minLon || lat > bs.maxLat || lat < bs.minLat)) {
                        // del_Points.push(p[i].point);
                        classSelf.map.removeOverlay(p[i]);
                    }
                } else if (p[i] != classSelf.mark) {

                    classSelf.map.removeOverlay(p[i]);
                }
            }
        }

        if (lv < 2) {
            classSelf.map.removeOverlay(classSelf.subway.circle);
            classSelf.map.removeOverlay(classSelf.subway.remark);
        }

        // if (del_Points.length > 0) {
        //     for (var i = del_Points.length - 1; i >= 0; i--) {
        //         myGeo.getLocation(del_Points[i], function(rs) {

        //             var addComp = rs.addressComponents;
        //             console.log('清除的数据:("' + addComp.province + ", " + addComp.city + ", " + addComp.district + ", " + addComp.street + ", " + addComp.streetNumber);
        //         });
        //     }
        // }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据百度地图的缩放级别，获取系统对应的Level 值
    @zoomLevel，百度缩放级别
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.getLevel = function(zoomLevel) {
        var classSelf = this;

        //如果lv没有值，默认使用百度api获取当前地图的缩放级别
        zoomLevel = zoomLevel || classSelf.map.getZoom();

        if (zoomLevel < classSelf.level[1]) {
            return 0;
        } else if (zoomLevel < classSelf.level[2] /*17*/ - 1) {
            return 1;
        } else {
            return 2;
        }
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    根据售价，户型，面积，特色下拉筛选条件构造请求数据
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.genSelect = function() {
        var s = $('#sj').attr('data-value'); //售价
        var h = $('#hx').attr('data-value'); //户型
        var m = $('#mj').attr('data-value'); //面积
        var t = $('#tc').attr('data-value'); //特色
        var requestData = {};

        if (s) requestData.s = s;
        if (m) requestData.m = m;
        if (h) requestData.h = h;
        if (t) requestData.t = t;

        return requestData;
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    获取地图可视区域，以西南和东北两个可视角的地理坐标组合下发
    @i：移动范围。例如30%的移动范围，i的为0.3. 当屏的移动范围对应的i值为1
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.bounds = function(i) {
        var classSelf = this;

        i = i || 0;
        var bs = classSelf.map.getBounds(); //获取可视区域
        var sw = bs.getSouthWest(); //可视区域左下角(西南角)
        var ne = bs.getNorthEast(); //可视区域右上角(东北角)

        return {
            'minLon': sw.lng - (ne.lng - sw.lng) * i,
            'maxLon': ne.lng + (ne.lng - sw.lng) * i,
            'minLat': sw.lat - (ne.lat - sw.lat) * i,
            'maxLat': ne.lat + (ne.lat - sw.lat) * i
        };
    }

    /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
    渲染地铁线路
    @lineId:地铁线路Id,
    @stationId:某地铁线下地铁站的Id
    -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setSubway = function(lineId, stationId) {
        var classSelf = this;

        //classSelf.clear();

        var requestData = {
            "cityId": classSelf.$frm.attr('data-id'),
            "houseType": classSelf.houseType,
            "subWayLineId": lineId
        };

        //继承筛选条件
        requestData = $.extend(requestData, classSelf.genSelect());

        //请求获取数据，stationList 地铁站; tracePoints 地铁站坐标点
        classSelf.request(this.apiUrl.houseMap.querySellListOnMapBySubWayLine, requestData, {
            process: function(resp) {
                var subway_data = resp.data;
                var points = [];

                //判断当前地铁id 和subway 缓存对象中进行比较
                //如果不相等，则重新绘制整条地体线路覆盖物
                if (lineId != classSelf.subway.id) {
                    //移除原先的地铁线路
                    if (classSelf.subway.line) {
                        classSelf.map.removeOverlay(classSelf.subway.line);
                    }

                    for (var i = subway_data.tracePoints.length - 1; i >= 0; i--) {
                        points.push(new BMap.Point(subway_data.tracePoints[i].lon, subway_data.tracePoints[i].lat));
                    }

                    //定义百度线覆盖物对象
                    var line = new BMap.Polyline(points, {
                        strokeColor: '#ffa200',
                        strokeWeight: 6,
                        strokeOpacity: 0.85
                    });

                    line.lid = lineId;

                    //缓存坐标点数据和地铁线覆盖物
                    classSelf.subway.line = line;
                    classSelf.subway.view = points;

                    classSelf.map.addOverlay(line);
                }

                //判断是否有缓存地铁站打点对象,存在则移除打点
                if (classSelf.subway.stations) {
                    for (var i = classSelf.subway.stations.length - 1; i >= 0; i--) {
                        classSelf.map.removeOverlay(classSelf.subway.stations[i]);
                    }
                } else {
                    classSelf.subway.stations = [];
                }

                //如果没有staionid,表示是绘制整条地铁线路，则需要将可视区域设置为整个地铁线路的可视区域
                if (!stationId) {
                    classSelf.begin = false;
                    classSelf.map.removeOverlay(classSelf.subway.circle);
                    classSelf.map.removeOverlay(classSelf.subway.remark);

                    //将可视区域设置为整个地铁线路的可视区域
                    classSelf.map.setViewport(classSelf.subway.view);

                    //重新渲染地图
                    setTimeout(function() {
                        classSelf.init()
                    }, classSelf.time);
                }

                //地铁站打点
                for (var p, i = subway_data.stationList.length - 1; i >= 0; i--) {
                    p = new BMap.Label('<p class="lv3"><i class="l"></i><i>' + subway_data.stationList[i].value + ' ' + subway_data.stationList[i].count + '套</i><i class="r"></i>', {
                        position: new BMap.Point(subway_data.stationList[i].lon, subway_data.stationList[i].lat)
                    });
                    p.setStyle({
                        border: 0,
                        background: '',
                        padding: 0
                    });
                    p.setZIndex(4);
                    p.lid = lineId;
                    p.key = subway_data.stationList[i].key;
                    p.addEventListener('mouseover', function() {
                        this.setStyle({
                            zIndex: 8
                        });
                    });
                    p.addEventListener('mouseout', function() {
                        if (!/(class=\"lv2 over)/i.test(this.getContent())) this.setStyle({
                            zIndex: 4
                        });
                    });
                    p.addEventListener('click', function() {
                        for (var s = classSelf.subway.stations.length - 1; s >= 0; s--) {
                            classSelf.subway.stations[s].setContent(classSelf.subway.stations[s].getContent().replace(/(class=\"lv3) over\"/i, '$1"'));
                        };
                        this.setContent(this.getContent().replace(/(class=\"lv3)\"/i, '$1 over"'));
                        this.setStyle({
                            zIndex: 7
                        });
                        var lon = this.getPosition().lng,
                            lat = this.getPosition().lat;
                        classSelf.setCircle(lon, lat);
                        classSelf.setList(4 /*按地铁线路*/ , this.lid, this.key);
                        classSelf.init(16, lon, lat);
                    });

                    if (stationId && subway_data.stationList[i].key === stationId) {
                        for (var s = classSelf.subway.stations.length - 1; s >= 0; s--) {
                            classSelf.subway.stations[s].setContent(classSelf.subway.stations[s].getContent().replace(/(class=\"lv3) over\"/i, '$1"'));
                        };
                        p.setContent(p.getContent().replace(/(class=\"lv3)\"/i, '$1 over"'));
                        classSelf.setCircle(subway_data.stationList[i].lon, subway_data.stationList[i].lat);
                    };
                    classSelf.subway.stations.push(p);
                    classSelf.map.addOverlay(p);
                };

                classSelf.subway.id = lineId;
            }
        });
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    描绘地铁周边1公里的圈
    @lon:经度
    @lat:纬度
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.setCircle = function(lon, lat) {
        var classSelf = this;

        var lid = classSelf.$line.find('.Selected').attr('data-id');
        classSelf.map.removeOverlay(classSelf.subway.circle);
        classSelf.map.removeOverlay(classSelf.subway.remark);
        classSelf.subway.circle = new BMap.Circle(new BMap.Point(lon, lat), 1000 /*1公里的圈*/ , {
            strokeColor: '#ffa200',
            strokeWeight: 2,
            strokeOpacity: 1,
            fillColor: '#ffa200',
            fillOpacity: 0.05,
            enableClicking: false
        });
        classSelf.subway.circle.lid = lid;
        classSelf.map.addOverlay(classSelf.subway.circle);

        //添加Label 标志画圈是以地铁站方圆1公里的圈
        classSelf.subway.remark = new BMap.Label('<p class="remark">1公里</p>', {
            position: new BMap.Point(lon, (parseFloat(lat) + 0.0095))
        });
        classSelf.subway.remark.setStyle({
            border: 0,
            background: ''
        });

        classSelf.subway.remark.lid = lid;
        classSelf.map.addOverlay(classSelf.subway.remark);
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义tips 方法
    @content:tips 显示内容
    @showLoading: 是否需要显示loading 效果
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    IndexController.prototype.tips = function(content, showLoading) {
        var classSelf = this;
        var $tips = $('#Tips');
        var win_width = $(window).width();

        if ($tips.length == 0) {
            $tips = $('<p id="Tips"></p>');
            $tips.appendTo('body');
        }

        if (!content) {
            $tips.fadeOut();
            return;
        }

        if (showLoading) {
            $tips.addClass('loading');
        } else {
            $tips.removeClass('loading');
        }

        $tips.html(content).show()
            .css('left', (Math.ceil(win_width - $tips.width()) / 2 / win_width * 100) + '%');

        if (classSelf.tim) clearTimeout(classSelf.tim);
        classSelf.tim = setTimeout(function() {
            $tips.fadeOut()
        }, 3000);
    }

    $(document).ready(function() {
        return new IndexController();
    });
});
