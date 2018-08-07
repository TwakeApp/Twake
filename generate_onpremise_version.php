<?php

echo "Please confirm your action, it cannot be undone. IMPORTANT : this action should be done on a just cloned directory from git repository !!";
$line = readline("Press any key then press enter");
if(!$line){
    die();
}

$exludedPathContaining = ["/.", "/src/Administration/", "/src/DevelopersApi/", "/tests", "/web/angular", "/web/app_dev.php", "/websocket_supervisor.sh", "/composer.lock", "/Ressources/Apis"];
$exludedLinesContaining = [" Administration\\", " DevelopersApi\\"];

function remove($path){
    if (is_dir($path)) {
        $objects = scandir($path);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (is_dir($path."/".$object))
                    remove($path."/".$object);
                else
                    unlink($path."/".$object);
            }
        }
        rmdir($path);
    }else{
        unlink($path);
    }
}

function getDirContents($dir){
    global $exludedPathContaining, $exludedLinesContaining;

    $files = scandir($dir);

    foreach($files as $key => $value){
        $path = realpath($dir.DIRECTORY_SEPARATOR.$value);

        if(strpos($path."/", "generate_onpremise_version.php") !== false
            || strpos($path."/", "/drive/") !== false
            || strpos($path."/", "/vendor/") !== false){
            continue;
        }

        $removed = false;
        foreach ($exludedPathContaining as $filter) {
            if(strpos($path."/", $filter) !== false){
                remove($path);
                $removed = true;
                break;
            }
        }

        if(!$removed){

            if(!is_dir($path)) {

                $extension = explode(".", $path);
                $extension = end($extension);

                if($extension!="phar") {

                    $content = file_get_contents($path);

                    $lines = explode("\n", $content);
                    $exclude = array();
                    $removing = false;
                    foreach ($lines as $line) {
                        $found = false;
                        foreach ($exludedLinesContaining as $contain) {
                            if (strpos($line, $contain) !== false) {
                                $found = true;
                            }
                        }
                        if (strpos($line, "[REMOVE_DOCKER]") !== false) {
                            $removing = true;
                        }

                        if (!$found && !$removing) {
                            if ($extension == "php") {
                                $line = str_replace(", $", ",$", $line);
                                $line = str_replace(") {", "){", $line);
                                $line = str_replace("if (", "if(", $line);
                                $line = str_replace("else {", "else{", $line);
                                $line = str_replace(" =", "=", $line);
                                $line = str_replace("= ", "=", $line);
                                $line = str_replace(" ? ", "?", $line);
                                $line = str_replace(" : ", ":", $line);

                                //Remove one line comments
                                $line = preg_replace("/([a-z0-9A-Z])'([a-z0-9A-Z])/", "$1$2", $line);
                                $splited = explode("//", $line);
                                if (count($splited) > 1 && (trim($splited[0]) == "" || !(strpos(end($splited), '"') !== false || strpos(end($splited), "'") !== false))) {
                                    array_pop($splited);
                                    $line = implode("//", $splited);
                                }

                                if (trim($line) != '') {
                                    $exclude[] = trim($line);
                                }
                            } elseif ($extension == "yml") {
                                $splited = explode("#", $line);

                                if (count($splited) > 1 && trim($splited[0]) == "") {
                                    array_pop($splited);
                                    $line = implode("#", $splited);
                                }

                                if (trim($line) != '') {
                                    $exclude[] = $line;
                                }
                            } else {
                                if (trim($line) != '') {
                                    $exclude[] = $line;
                                }
                            }
                        }

                        if (strpos($line, "[/REMOVE_DOCKER]") !== false) {
                            $removing = false;
                        }
                    }
                    if ($extension == "php" && strpos($path . "/", "/src/") !== false) {
                        if (strpos($path . "/", "/Entity/") !== false) {
                            $content = implode("\n", $exclude);
                        } else {
                            $content = implode("", $exclude);
                        }
                        $content = str_replace("<?php ", "<?php", $content);
                        $content = str_replace("<?php", "<?php ", $content);

                        if (strpos($path . "/", "/Entity/") === false && strpos($path . "/", "/Controller/") === false) {
                            preg_match_all("/\\$[a-zA-Z_][a-zA-Z_0-9]+/", $content, $variables);
                            $variables = array_unique($variables[0]);
                            $replaceA = [];
                            $replaceB = [];
                            foreach ($variables as $variable) {
                                if ($variable != '$this') {
                                    $replaceA[] = $variable;
                                    $replaceB[] = '$v' . md5($variable);
                                }
                            }
                            $content = str_replace($replaceA, $replaceB, $content);

                            //Re replace class vars
                            preg_match_all("/var +\\$[a-zA-Z_][a-zA-Z_0-9]+/", $content, $variables);
                            $variables = array_unique($variables[0]);

                            $replaceA = [];
                            $replaceB = [];
                            foreach ($variables as $variable) {
                                $variable = explode(" ", $variable);
                                $variable = $variable[1];
                                $replaceA[] = '$v' . md5($variable);
                                $replaceB[] = $variable;
                            }
                            $content = str_replace($replaceA, $replaceB, $content);

                        }

                        if (strpos($path . "/", "/Entity/") === false) {
                            $content = preg_replace('!/\*.*?\*/!s', '', $content);
                        }

                    } else {
                        $content = implode("\n", $exclude);
                    }

                    file_put_contents($path, $content);

                }

            } else if($value != "." && $value != "..") {
                getDirContents($path);
            }

        }

    }

}

getDirContents('./')

?>
