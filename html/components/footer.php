        <!--页面脚本区域-->
        <script src="<?php echo STATIC_DOMAIN ; ?>/web_fe_rebuild/config.js"></script>
        <script data-main="<?php echo STATIC_DOMAIN ; ?>/web_fe_rebuild/jssrc/app" src="<?php echo STATIC_DOMAIN ; ?>/fe_public_library/wkzf/js/require.min.js"></script>
        <?php
            for( $n = 0 ; $n < sizeof($confs["extra_javascripts"]) ; $n ++ ) {
        ?>
        <script src="<?php echo $confs["extra_javascripts"][$n] ; ?>"></script>
        <?php } ?>
     
        <script src="<?php echo STATIC_DOMAIN ; ?>/web_fe_rebuild/jssrc/<?php echo $router["controller"] ; ?>/<?php echo $router["method"] ; ?>.js" ></script>       
    </body>
</html>