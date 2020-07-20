var editor = ace.edit("editor");

/**
 * @param {boolean} value
 */
function buttonEnable(value) {
    if (value === false) {
        $('#exeButton').attr('disabled', '');
        $('#exeButton').html('<span class="spinner-border" role="status" aria-hidden="true"></span><span class="sr-only">处理中…</span>')
    } else if (value === true) {
        $('#exeButton').removeAttr('disabled');
        $('#exeButton').html('编译并运行')
    }
}
/**
 * @param {string|boolean} text
 */
function refreshMessage(text) {
    $('#toastIcon').removeClass();
    $('#stdout').removeClass('error-output text-danger');
    $('#compilerMessage').removeClass('alert-light alert-warning alert-danger alert-success');
    // compile success
    if (text === true) {
        $('#compilerMessage').addClass('alert-success').text('（编译成功）');
        $('#notify').children('.toast-body').text('成功编译并运行完毕。');
        $('#toastIcon').addClass('text-success');
        $('#notify').toast('show');
        return;
    }
    // not compiled yet
    if (text === false) {
        $('#compilerMessage').addClass('alert-light').text('（无）');
        return;
    }
    // compile error (warning)
    if (text.indexOf('error') != -1) {
        $('#compilerMessage').addClass('alert-danger').text(text);
        $('#notify').children('.toast-body').text('编译出现错误。');
        $('#toastIcon').addClass('text-danger');
        $('#notify').toast('show');
    } else {
        $('#compilerMessage').addClass('alert-warning').text(text);
        $('#notify').children('.toast-body').text('编译完成，但存在警告。');
        $('#toastIcon').addClass('text-warning');
        $('#notify').toast('show');
    }
}
function compile() {
    buttonEnable(false);
    const code = editor.getValue();
    const stdin = $('#stdin').val();
    let params = new URLSearchParams();
    params.set('code', code);
    window.history.replaceState(null, null, '?' + params.toString());
    console.log('Request:')
    const request = {
        code: code,
        stdin: stdin,
        options: `${$('#pedantic').val()},${$('#cppStandard').val()}`,
        compiler: 'gcc-10.1.0'
    }
    console.log(request);
    console.log('Sending to Wandbox...')
    $.ajax({
        url: 'https://wandbox.org/api/compile.json',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(request),
        dataType: "json",
        success: result => {
            buttonEnable(true);
            console.log('Success. Response content:');
            console.log(result);
            $('#stdout').val(result.program_message);
            refreshMessage(true);
            if ('compiler_message' in result) {
                refreshMessage(result.compiler_message);
            }
            if ('program_error' in result) {
                $('#stdout').addClass('error-output text-danger');
            }
        },
        error: xhr => {
            buttonEnable(true);
            alert('发送编译请求时出现错误，请重试。');
            console.error('Error occured while sending request：', xhr.statusText);
            console.log(xhr);
            refreshMessage(false);
        }
    });
}

editor.setTheme("ace/theme/clouds");
editor.session.setMode("ace/mode/c_cpp");
editor.commands.addCommand({
    name: "myCommand",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: () => compile()
});
editor.focus();

{
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
        editor.setValue(params.get('code'));
        editor.clearSelection();
    }
    $('[data-toggle="popover"]').popover();
}