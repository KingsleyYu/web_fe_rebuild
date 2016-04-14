/*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1. 项目名称：www.wkzf.com
 2. 页面名称：components/map/pre.js(地图找房关键字搜索功能)
 3. 作者：俞晓晨(yuxiaochen@lifang.com)
 4. 备注：
 -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
define(function() {

    //定义Pre对象
    var Pre = {
        frm: $('.Pre'),
        getName: function() {
            return 'pre_' + this.frm.attr('data-lx') + '_' + this.frm.attr('data-id');
        },
        kill: function(i) {
            if (i) {
                return i.replace(/(^\s*|(\s*$))/g, '');
            } else {
                return '';
            };
        },
        save: function(kw) {
            if (kw != '') {
                var name = this.getName();
                var h = localStorage.getItem(name);
                if (h) {
                    h = h.split(',');
                    for (var i = h.length - 1; i >= 0; i--) {
                        if (h[i] == kw) {
                            h.splice(i, 1);
                            break;
                        };
                    };
                    h.unshift(kw);
                    if (h.length > 10) h.length = 10;
                    localStorage.setItem(name, h.join(','));
                } else {
                    localStorage.setItem(name, kw);
                };
            };
        }
    }


    function MapFilterController() {
        /*-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
          继承于Controller基类
          -----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        Controller.call(this);

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        定义表单提交操作
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.initFormSubmit();

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        搜索内容框事件绑定
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.addListenersToInput();

        /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        除form 外的元素的点击事件的定义
        --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
        this.addListenersToDocument();
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    定义表单提交操作
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapFilterController.prototype.initFormSubmit = function() {
        Pre.frm.submit(function(event) {
            /* Act on the event */
            var _this = $(this);

            //提交时，保存输入内容
            Pre.save(_this.contents('input:text').val());

            //隐藏下方历史查询记录
            _this.contents('.Pa').hide();

            return false;
        });
    }


    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    搜索内容框事件绑定
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapFilterController.prototype.addListenersToInput = function() {
        var classSelf = this;

        $('.Pre').find('input:text').on({
            "blur": function() {
                var _this = $(this);
                setTimeout(function() {
                    _this.siblings('.Pa').hide()
                }, 200);
            },
            "keyup": function(e) {
                var _this = $(this);
                var kc = e.keyCode;
                var $pa = _this.siblings('.Pa');
                var keyWord = Pre.kill(_this.val());
                var houseType = Pre.frm.attr('data-lx');
                var cityId = Pre.frm.attr('data-id');

                //忽略ESC 上 下 回车 键
                if (kc == 27 || kc == 38 || kc == 40 || kc == 13) {
                    return false;
                }

                if ($pa.length == 0) {
                    $pa = $('<p class="Pa"></p>');

                    $pa.insertAfter(_this);
                }

                //防止相同内容多次查询
                if (keyWord == _this.attr('attr-kw')) {
                    return false;
                } else {
                    _this.attr('data-kw', keyWord);
                }

                if (keyWord == '') {
                    $pa.html('').hide();
                    _this.focus();
                    return;
                }

                if (classSelf.ajax) {
                    //主动释放ajax请求，避免多次请求阻塞页面渲染
                    classSelf.ajax.abort();
                }

                //请求接口获取匹配输入内容的keyword list
                classSelf.ajax = classSelf.request(classSelf.apiUrl.houseMap.searchKeywords, {
                    key: keyWord,
                    houseType: houseType,
                    cityId: cityId
                }, {
                    process: function(resp) {
                        if (resp.data && resp.data.length > 0) {
                            var k_data = resp.data;
                            var htmlTpl = '';
                            $pa.html('');

                            for (var i = 0; i < k_data.length; i++) {
                                htmlTpl += '<i>' + k_data[i] + '</i>';
                            };

                            //autocomplete 数据展示行绑定事件
                            if (htmlTpl) {
                                $pa.html(htmlTpl).show().contents('i').click(function() {
                                    _this.val($(this).text()).parent().submit();
                                }).mouseover(function() {
                                    $(this).addClass('act');
                                }).mouseout(function() {
                                    $(this).removeClass('act');
                                });
                            }

                        } else {
                            $pa.html('').hide();
                        }
                    },
                    onErrorInterface: function() {
                        $pa.hide();
                    }
                });
            },
            "click": function() {
                var _this = $(this);
                var $pa = _this.siblings('.Pa');
                var keyWord = Pre.kill(_this.val());
                var houseType = Pre.frm.attr('data-lx');
                var cityId = Pre.frm.attr('data-id');

                if ($pa.length == 0) {
                    $pa = $('<p class="Pa"></p>');
                    $pa.insertAfter(_this);
                }

                //如没有输入内容，则点击的时候需要从localStorage 中获取历史查询记录，并下拉展现
                if (keyWord == '') {
                    var h = localStorage.getItem(Pre.getName());
                    if (h) {
                        var t = '';
                        h = h.split(',');
                        for (var i = 0; i < h.length; i++) {
                            t += '<i>' + h[i] + '</i>';
                        };
                        if (t) {
                            $pa.html(t).show().contents('i').click(function() {
                                _this.val($(this).text()).parent().submit();
                            }).mouseover(function() {
                                $(this).addClass('act');
                            }).mouseout(function() {
                                $(this).removeClass('act');
                            });
                        }
                    }

                    return false;
                } else {
                    if ($pa.html() == '') {
                        _this.keyup();
                    } else {
                        $pa.show();
                    }
                }
            },
            "focus": function() {
                this.click();
            }
        });
    }

    /*--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    除form 外的元素的点击事件的定义
    --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    MapFilterController.prototype.addListenersToDocument = function() {
        var classSelf = this;

        $(document).on("click", function(e) {
            var tagObj = e.target || e.srcElement;
            if ($(tagObj).parents('.Pre').length == 0) {
                Pre.frm.contents('.Pa').hide();
            }
        });

        $(document).on("keydown", function(e) {
            var $pa = Pre.frm.contents('.Pa');

            if ($pa.is(':visible')) {
                var kc = e.keyCode; //按键Code
                if (kc == 27 || kc == 13) { //ESC|回车
                    $pa.hide();
                } else if (kc == 38 || kc == 40) { //上|下
                    $pa.act = -1;
                    $pa.i = $pa.contents("i");
                    for (var i = $pa.i.length - 1; i >= 0; i--) {
                        if ($pa.i.eq(i).hasClass('act')) $pa.act = i;
                        $pa.i.eq(i).removeClass('act');
                    };
                    if (kc == 38) { //上
                        if ($pa.act <= 0) {
                            $pa.act = pa.i.length - 1;
                        } else {
                            $pa.act--;
                        };
                    } else if (kc == 40) { //下
                        if ($pa.act < 0 || $pa.act >= $pa.i.length - 1) {
                            $pa.act = 0;
                        } else {
                            $pa.act++;
                        };
                    };
                    $pa.siblings('input:text').val($pa.i.eq($pa.act).text());
                    $pa.i.eq($pa.act).addClass('act');
                };
            };
        });
    }


    return new MapFilterController();
});
