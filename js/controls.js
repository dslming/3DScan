$(document).ready(() => {
    $('.dropdown-trigger').dropdown();

    $('.leftside li').click((e) => {
        $('.leftside li').removeClass('active');
        $(e.target).parent().addClass('active');
    });

    $('.rightside li').click((e) => {
        $('.rightside li').removeClass('active');
        $(e.target).parent().addClass('active');
    });



})