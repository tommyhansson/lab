<?php
	$time_start = microtime(true);

	$errors = array();
	$warnings = array();
	$num_files_scanned = array('whole' => 0, 'part' => 0);

	$files_scanned_part = 0;
	$files_scanned_whole = 0;

	$default_dir = "/var/www";
	$dir = isset($_GET['path']) && base64_encode(base64_decode($_GET['path'])) === $_GET['path'] ? base64_decode($_GET['path']) : $default_dir;

	$max_buffer_size = isset($_GET['maxbuffer']) ? ($_GET['maxbuffer']*1024) : (10*1024);
	
	$hits = array();
	$vulnerabilities = array(   "JCE"			=> array(	'pattern'			=> '~<name>JCE</name>(?s:.)*?<version>([0-9\.]{1,8})<\/version>~',
															'version'			=> '2.0.10',
			                                        		'description'		=> 'Vulnerable JCE',
			                                        		'match_extensions'	=> array('xml')
			                                   			),
                            	"Shellscript"   => array(   'pattern'           => '~C100|c99|action\s=\s[\'|\"]FilesMan~',
                            								'version'           => 'ALL',
                                                        	'description'       => 'Shellscript',
                                                        	'match_extensions'	=> array('xml', 'php')
                                                    	),
                            	"Malware"       => array(   'pattern'           => '~eval\(gzinflate\(base64_decode|eval\(base64_decode|eval\(gzinflate\(base64_decode|eval\(gzinflate\(str_rot13\(base64_decode|error_reporting\(0\)~',
                            								'version'           => 'ALL',
	                                                        'description'       => 'Possible malware',
                                                        	'match_extensions'	=> array('xml', 'php')
	                                                    ),
                            	"TimThumb"      => array(	'pattern'           => '~TimThumb script created by Tim McDaniels and Darren Hoyt|TimThumb script created by Ben Gillbanks\, originally created by Tim McDaniels and Darren Hoyt|TimThumb by Ben Gillbanks(?s:.)*?define\s*\([\'|\"]{1}VERSION[\'|\"]{1},\s*[\'|\"]{1}([0-9\.]+)[\'|\"]{1}\)~', // example: define ('VERSION', '2.8.13');
                                                        	'version'           => '2.9.2',
                                                        	'description'       => 'Vulnerable TimThumb',
                                                        	'match_extensions'	=> array('xml', 'php')
                                                    	)	
	                        );
	// Skapa array med alla filtyper
	$all_ext = array();
	foreach( $vulnerabilities as $key => $v ){
		if( is_array($all_ext) ){
			foreach( $v['match_extensions'] as $ext ){
				if( !in_array($ext, $all_ext) ) $all_ext[] = $ext;
			}
		}
	}

	function scan_file($file_path, $vuln, $max_buffer_size, &$num_files_scanned, &$errors, &$warnings){
		$hits = array();
		// Kolla filstorlek
		if( ($filesize = filesize($file_path)) > 0 ){ // Kontrollera om filen är tom
			if( $filesize > $max_buffer_size ){
				$warnings[] = "Large file (reading first $max_buffer_size bytes): ".$file_path;
				$buffer_size = $max_buffer_size;
				$num_files_scanned['part']++;
			}else{
				$buffer_size = $filesize;
				$num_files_scanned['whole']++;
			}


			// Öppna fil
			if( $file_handle = @fopen($file_path, 'r') ){
				$file_contents = fread($file_handle, $buffer_size);

				// Gå igenom alla vuln.
				foreach($vuln as $key => $v){
					if( in_array( pathinfo($file_path, PATHINFO_EXTENSION), $v['match_extensions'] )){
						if( preg_match_all($v['pattern'], $file_contents, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER) > 0 ){
							foreach($matches as $m){
								if( $v['version'] == 'ALL' || version_compare($m[1][0], $v['version'], '<=') ){ 
										// Hit!
										$line = substr_count( $file_contents, "\n", 0, $m[0][1]);
										//$current_line = explode("\n", $file_contents);

										$hits[$file_path][] = array(	'description' 		=> $v['description'],
																		'string_matched' 	=> substr($m[0][0], 0, 30),
																		'index'				=> $m[0][1]+1,
																		'line'				=> $line+1,
																		//'current_line'	=> $current_line[$line],
																		'version'			=> $m[1][0]
																	);
								}
							}
						}
					}
				}
				return $hits;
			}else{
				$errors[] = 'Could not open file: '.$file_path;
				return false;
			}
		}else{
			$warnings[] = "File <i>{$file_path}</i> is empty";
			return false;
		}
	}


	function get_dir_contents($basepath, &$errors, &$warnings){
        if( is_dir($basepath) ){
            $inventory = array();
            if( !$dir_handle = opendir($basepath) ){
            	$errors[] = "Could not open ".$basepath; 
                return false;
            }

            while ( $file = readdir($dir_handle) ){
                if( $file != '.' && $file != '..' ){ // Don't include current or parent dir
                    $fullpath = $basepath ."/". $file;

                    if ( is_dir($fullpath) ){
                        $inventory = array_merge( $inventory, get_dir_contents($fullpath, $errors, $warnings) );
                    }else {
                        $inventory[] = $fullpath;
                    }
                }
            }
            closedir( $dir_handle );
            return $inventory;
        }else{
        	$errors[] = "Could not open directory: ".$basepath;
        	return false;
        }
    }
?>
<form method="get" action="<?php echo $_SERVER['PHP_SELF']; ?>" onsubmit="this.path.value=btoa((this.path.value).trim());">
	<input type="text" name="path" placeholder="Path" />
	<input type="submit" value="Scan!" />
</form>
<p style="font-size: 12px; color: #bbb">
	example:
	<br />#1. /var/www/dev/regex/scanthis (default)
	<br />#2. /var/www/dev/scan/testdir
</p>

<h4>Directory: <?php echo $dir; ?></h4>
<h4>Max buffer size: <?php echo $max_buffer_size; ?> kb</h4>

<?php
    $all_hits = array();
    if( $contents = get_dir_contents($dir, $errors, $warnings) ){
    	foreach( $contents as $file ){
	    	if( $scan_results = scan_file($file, $vulnerabilities, $max_buffer_size, $num_files_scanned, $errors, $warnings) ){
	    		$all_hits[] = $scan_results;
	    	}
	    }

	    echo "<h1>:)</h1>";
		echo "<h3>".sizeof($all_hits)." possible vulnerabilities found</h3>";
		if( sizeof($all_hits) > 0 ){
			echo "These are:";
		    echo "<pre>";
		    print_r($all_hits);
		    echo "</pre>";
		}
    }else{
    	echo "<h1>:'(</h1>";
    	$errors[] = "Some sort of error...";
    }

// Visa fel och vaningar
if( sizeof($errors) > 0 ){
	echo "<h3>Errors</h3>";
    echo "<pre>";
    print_r($errors);
    echo "</pre>";
}

	echo "<h3>Warnings (".sizeof($warnings).")</h3>";
if( sizeof($warnings) > 0 ){
    echo "<pre>".print_r( $warnings, 1 )."</pre>";
}
	echo "<br /><br />Large files, scanned first 10 kb: ".$num_files_scanned['part'];
	echo "<br />Small files: ".$num_files_scanned['whole'];
	echo "<br />Total: ".($num_files_scanned['whole']+$num_files_scanned['part']);
	echo "<br /><br />";
	$time_end = microtime(true);
	$time = $time_end - $time_start;

	echo "Executed in ".number_format($time, 3)." seconds\n";
?>