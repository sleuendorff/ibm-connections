$(function() {  
    $("#cl").tabs(
        "#cl .body",
        {tabs: 'header', effect: 'slide', initialIndex: 0}
    );
    $("#ig img").each(function(i) {
        this.id="zoom-"+i;
    }).attr('rel','#lb').addClass('zoom').overlay({
        top: '5%',
        mask: {
            color: '#fff',
            loadSpeed: 200,
            opacity: 0.5
        },
        onBeforeLoad: function(){
            var max = $("#ig img").length,
                timg = this.getTrigger(),
                f = timg.width()/timg.height(),
                h = $(window).height()*0.9,
                mw = $(window).width()*0.9,
                h = Math.min(mw/f,h);
            $('#lbimg').attr('src', $(timg).attr('src'));
            $('#lbimg').height(h);
            $('#lb').width(f*h);
        }
    });
});