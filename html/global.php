<?php
    //本应用的一些配置参数
    const STATIC_DOMAIN = "//127.0.0.1" ;    //静态资源域名
    //取得当前模板页面的末级目录和文件名不带后缀的
    $uri_components = explode("/", $_SERVER["PHP_SELF"]) ;
    $router = array() ;
    $router["controller"] = $uri_components[sizeof($uri_components) - 2] ;
    $router["method"] = substr($uri_components[sizeof($uri_components) - 1], 0, strpos($uri_components[sizeof($uri_components) - 1], ".")) ;    
?>