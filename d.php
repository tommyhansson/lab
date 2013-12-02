<?php
	/*
		†ಠლ  · toh@one.com
	*/

	$domain = $_SERVER['HTTP_HOST'] === "localhost" ? null : $_SERVER['HTTP_HOST'];
	$path = isset($_GET['path']) && base64_decode($_GET['path']) ? base64_decode($_GET['path']) : "/dev/lab/cookie/eh.php";

	setcookie("onecomautodebug", "true", time()+3600, $path, $domain);
	header("Location: ".$domain.$path);
	exit;
?>