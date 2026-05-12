<?php $m=new mysqli('localhost','u9iut9rkejrvz','df(b2bf%ff3c','db9olsrf7dbigq'); if($m->connect_error) die($m->connect_error); $res=$m->query('SHOW TABLES'); while($r=$res->fetch_row()){ echo 'TABLE: '.$r[0]."
"; $res2=$m->query('DESCRIBE '.$r[0]); while($r2=$res2->fetch_assoc()){ echo '  '.$r2['Field'].' ('.$r2['Type'].")
"; } } ?>