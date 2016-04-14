<?php require_once("../global.php") ; ?>
<?php    
    $confs = array(
        "page_title" => "悟空地图找房" ,  //每个页面标题会在这个字符串后面自动追加 " - 悟空找房业务系统"
        "match_stylesheet" => true ,  //是否需要匹配路由的样式表
        "extra_stylesheets" => array() ,  //除了默认加载的bootstrap.min.css以及app.min.css，还需要加载额外的样式表吗？有，请写在数组里面
        "extra_javascripts" => array("http://api.map.baidu.com/api?v=2.0&ak=qNYWrlPhhs31jXqbHLMnKWrI")  //除了加载app.min.js | require.js | 本页控制器外，是否还需要预先加载其他资源
    ) ;    
?>
<?php require_once("../components/header.php") ; ?>          
<div id="Map"></div>
<div class="main">
	<form class="Pre" data-lx="1">
		<dl class="Select">
			<dt>
				<i class="Selected">二手房</i>
				<i class="wk_iconfont">&#xe60b;</i>
			</dt>
			<dd class="Dn">
				<a href="">二手房</a>
				<a href="">新房</a>
			</dd>
		</dl>
		<input type="text" placeholder="输入地址或小区" maxlength="50" autocomplete="off">
		<button type="submit" class="wk_iconfont">&#xe610;</button>
	</form>
	<div class="Cb">
		<dl id="Area" class="Select">
			<dt>
				<i class="Selected">区域找房</i>
				<i class="wk_iconfont">&#xe60b;</i>
			</dt>
			<dd class="Dn"></dd>
		</dl>
		<dl id="Line" class="Select">
			<dt>
				<i class="Selected">地铁找房</i>
				<i class="wk_iconfont">&#xe60b;</i>
			</dt>
			<dd class="Dn"></dd>
		</dl>
	</div>
	<dl class="Select">
		<dt>
			<i id="sj" class="Selected">售价</i>
			<i class="wk_iconfont">&#xe60b;</i>
		</dt>
		<dd class="Dn">
			<i data-value="0">全部</i>
			<i data-value="1">100万以下</i>
			<i data-value="2">100-150万</i>
			<i data-value="3">150-200万</i>
			<i data-value="4">200-250万</i>
			<i data-value="5">250-300万</i>
			<i data-value="6">300-500万</i>
			<i data-value="7">500-1000万</i>
			<i data-value="8">1000-2000万</i>
			<i data-value="9">2000万以上</i>
		</dd>
	</dl>
	<dl class="Select" style="width:91px">
		<dt>
			<i id="hx" class="Selected">户型</i>
			<i class="wk_iconfont">&#xe60b;</i>
		</dt>
		<dd class="Dn">
			<i data-value="0">全部</i>
			<i data-value="1">一室</i>
			<i data-value="2">两室</i>
			<i data-value="3">三室</i>
			<i data-value="4">四室</i>
			<i data-value="5">五室以上</i>
		</dd>
	</dl>
	<dl class="Select">
		<dt>
			<i id="mj" class="Selected">面积</i>
			<i class="wk_iconfont">&#xe60b;</i>
		</dt>
		<dd class="Dn">
			<i data-value="0">全部</i>
			<i data-value="1">50平米以下</i>
			<i data-value="2">50-70平米</i>
			<i data-value="3">70-90平米</i>
			<i data-value="4">90-110平米</i>
			<i data-value="5">110-130平米</i>
			<i data-value="6">130-150平米</i>
			<i data-value="7">150-200平米</i>
			<i data-value="8">200-300平米</i>
			<i data-value="9">300平米以上</i>
		</dd>
	</dl>
	<dl class="Select" style="width:91px">
		<dt>
			<i id="tc" class="Selected">特色</i>
			<i class="wk_iconfont">&#xe60b;</i>
		</dt>
		<dd class="Dn">
			<i data-value="0">全部</i>
			<i data-value="1">满二</i>
			<i data-value="2">满五唯一</i>
			<i data-value="4">公寓</i>
			<i data-value="5">别墅</i>
		</dd>
	</dl>
	<div id="List"></div>
</div>
<?php require_once("../components/footer.php") ;  ?>