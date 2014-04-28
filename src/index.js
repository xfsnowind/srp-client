$(document).ready(function () {
    function getSRPClient (username, password) {
        return new SRPClient(username, password, 1024);
    }

    function getRegisterationURL (username, password) {
        var srp = getSRPClient(username, password),
            salt = srp.randomHexSalt(),
            verifier = srp.calculateV(salt).toString(16);

        return "/register?username=" + username + "&salt=" + salt + "&verifier=" + verifier;
    }

    $("#register").on("click", function (event) {
        var username = $("#username").val(),
            password = $("#password").val();

        $.ajax({
            url: getRegisterationURL(username, password),
            type: "GET",
            success: function (data) {
                console.log(JSON.stringify(data));
            }
        });

    });

    $("form").on("submit", function (event) {
        var username = $("#username").val(),
            password = $("#password").val(),
            srp = getSRPClient(username, password),
            a = srp.srpRandom(),
            A = srp.calculateA(a),
            Sclient = "";

        event.preventDefault();
        $.ajax({
            url: "/auth/step1?username=" + username + "&A=" + A.toString(16),
            type: "GET",
            success: function (data) {
                if (!data.B || !data.salt)
                    return;
                var B = new BigInteger();
                B.fromString(data.B, 16);
                var u = srp.calculateU(A, B);
                Sclient = srp.calculateS(B, data.salt, u, a);
                $.ajax({
                    url: "/auth/step2?S=" + Sclient.toString(16),
                    type: "GET",
                    success: function (result) {
                        console.log(result.auth);
                    }
                });
            },
            error: function (data) {
                console.log(JSON.stringify(data));
            }
        });
    });
});
