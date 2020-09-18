require.config({ paths: { vs: 'https://cdn.staticfile.org/monaco-editor/0.20.0/min/vs' } })

// https://github.com/egoist/vue-monaco
window.MonacoEnvironment = {
    getWorkerUrl: function (workerId, label) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://cdn.staticfile.org/monaco-editor/0.20.0/min/'
        };
        importScripts('https://cdn.staticfile.org/monaco-editor/0.20.0/min/vs/base/worker/workerMain.js');`)}`
    }
}

/**
 * 
 * @param {("success"|"error"|"warning")} type 
 */
function showToast(type) {
    switch (type) {
        case "success":
            $('#notify').children('.toast-body').text('成功编译并运行完毕。');
            $('#toastIcon').addClass('text-success');
            break;
        case "error":
            $('#notify').children('.toast-body').text('编译出现错误。');
            $('#toastIcon').addClass('text-danger');
            break;
        case "warning":
            $('#notify').children('.toast-body').text('编译完成，但存在警告。');
            $('#toastIcon').addClass('text-warning');
            break;
    }
    $('#notify').toast('show');
}

Vue.component('my-monaco-editor',
    {
        props: [
            'value'
        ],
        data: function () {
            return {
                code: this.value,
                options: {
                    fontSize: 16,
                    lineNumbersMinChars: 2,
                    minimap: {
                        enabled: false
                    },
                    automaticLayout: true
                }
            };
        },
        template: `
        <monaco-editor
            ref="editor"
            style="height: 100%; width: 100%;"
            v-model="code"
            language="cpp"
            v-on:change="$emit('input', $event)"
            v-on:editorDidMount="editorDidMount"
            v-bind:options="options"
            v-bind:amdRequire="amdRequire"
        />`,

        methods: {
            editorDidMount: function (editor) {
                editor.addAction({
                    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-adding-an-action-to-an-editor-instance
                    id: 'compile',
                    label: 'Compile',
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
                    ],
                    run: function () {
                        vm.compile();
                    }
                });
            },
            amdRequire: require
        }
    })

var vm = new Vue({
    el: "#app",
    data: {
        cppStandard: "c++2a",
        standards: [
            {
                value: "c++2a",
                name: "C++20"
            },
            {
                value: "c++17",
                name: "C++17"
            },
            {
                value: "c++14",
                name: "C++14"
            },
            {
                value: "c++11",
                name: "C++11"
            },
            {
                value: "c++98",
                name: "C++03"
            }
        ],
        pedantic: "cpp-pedantic",
        pedantics: [
            {
                value: "cpp-pedantic-errors",
                name: "pedantic-errors"
            },
            {
                value: "cpp-pedantic",
                name: "pedantic"
            },
            {
                value: "cpp-no-pedantic",
                name: "none"
            }
        ],
        code: '',
        input: '',
        output: '',
        inputHeader: `输入&nbsp;<small>Input</small>
        <i class="iconfont icon-iconfontquestion" data-trigger="hover" data-toggle="popover"
            title="帮助" data-content="由于网页的限制，您需要将程序的输入内容(stdin)提前写在下面的文本框中。所以您无法交互式地运行程序。">
        </i>`,
        outputHeader: `输出&nbsp;<small>Output</small>
        <i class="iconfont icon-iconfontquestion" data-trigger="hover" data-toggle="popover"
            title="帮助" data-content="编译并运行后，输出(stdout)和程序错误信息(stderr)都会出现在这里。如果出现错误，字体将变为红色。">
        </i>`,
        isCompiling: false,
        compilerMessage: '（无）',
        compilerMessageClass: 'alert-light',
        isRuntimeError: false
    },
    methods: {
        codeUpdated: function (code) {
            this.code = code;
        },
        refreshMessage: function (text) {
            $('#toastIcon').removeClass();
            // compile success
            if (text === true) {
                this.compilerMessage = '（编译成功）';
                this.compilerMessageClass = 'alert-success';
                showToast("success");
                return;
            }
            // not compiled yet
            if (text === false) {
                this.compilerMessage = '（无）';
                this.compilerMessageClass = 'alert-light';
                return;
            }
            this.compilerMessage = text;
            // compile error (warning)
            if (text.indexOf('error:') != -1) {
                this.compilerMessageClass = 'alert-danger';
                showToast("error");
            } else {
                this.compilerMessageClass = 'alert-warning';
                showToast("warning");
            }
        },
        compile: function () {
            this.isCompiling = true;
            const code = this.code;
            const stdin = this.input;
            let params = new URLSearchParams();
            params.set('code', code);
            window.history.replaceState(null, null, '?' + params.toString());
            console.log('Request:')
            const request = {
                code: code,
                stdin: stdin,
                options: `${this.pedantic},${this.cppStandard}`,
                compiler: 'gcc-10.1.0'
            }
            console.log(request);
            console.log('Sending to Wandbox...')
            fetch('https://wandbox.org/api/compile.json', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(request)
            })
                .then(response => response.json())
                .then(result => {
                    this.isCompiling = false;
                    console.log('Success. Response content:');
                    console.log(result);
                    this.output = result.program_message;
                    this.refreshMessage(true);
                    if ('compiler_message' in result) {
                        this.refreshMessage(result.compiler_message);
                    }
                    this.isRuntimeError = ('program_error' in result);
                })
                .catch(err => {
                    this.isCompiling = false;
                    alert('发送编译请求时出现错误，请重试。');
                    console.error('Error occured while sending request：', err);
                    this.refreshMessage(false);
                });
        }
    },
    created: function () {
        const params = new URLSearchParams(window.location.search);
        if (params.has('code')) {
            this.code = params.get('code');
        }
    },
    mounted: function () {
        $('[data-toggle="popover"]').popover();
    }
})

