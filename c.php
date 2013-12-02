<?php
	/*error_reporting(E_ALL);
	if( isset($_GET['debug']) ){
		setcookie("onecomautodebug", "true");
	}
	$url = isset($_GET['url']) && base64_decode($_GET['url']) ? base64_decode($_GET['url']) : "http://localhost/dev/lab/cookie/site.php";
	//$url = isset($_GET['url']) && base64_decode($_GET['url']) ? base64_decode($_GET['url']) : "http://tellus.so/index.htm";

	//header("Location: ".$url);
	//exit;

	include "tellus.so/index.html";*/

	header("Set-Cookie: onecomautodebug=true");
	header("Location: http://www.tellus.so");
?>