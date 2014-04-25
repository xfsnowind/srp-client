$(document).ready(function () {
    var basicURL = "http://localhost:8080/";

    function getRegisterationURL (username, password) {
        var srp = new SRPClient(username, password),
            salt = srp.randomHexSalt(),
            verifier = srp.calculateV(salt).toString();

        return "register?username=" + username + "&salt=" + salt + "&verifier=" + verifier;
    }

    function getSRPClient (username, password) {
        return new SRPClient(username, password);
    }

    function getAuthenticationStep1URL (username, srp) {
        A = srp.calculateA(srp.srpRandom());
        return "auth/step1?username=" + username + "&A=" + A;
    }


    $("form").on("submit", function (event) {
        var username = $("#username").val(),
            password = $("#password").val(),
            srp = getSRPClient(username, password),
            a = srp.srpRandom(),
            A = srp.calculateA(a);

        event.preventDefault();
        $.ajax({
            url: basicURL + "auth/step1?username=" + username + "&A=" + A,
            // crossDomain : true,
            type: "GET",
            // dataType: 'jsonp',
            success: function (data) {
                if (!data.B || !data.salt)
                    return;
                var B = new BigInteger();
                B.fromString(data.B, 16);
                var u = srp.calculateU(A, B),
                    Sclient = srp.calculateS(data.B, data.salt, u, a);
                $.ajax({
                    url: basicURL + "auth/step2?S=" + Sclient,
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
