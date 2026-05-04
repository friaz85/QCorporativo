<?php $m=new mysqli('localhost','u9iut9rkejrvz','df(b2bf%ff3c','db9olsrf7dbigq'); $res=$m->query('DESCRIBE tblCodigoEntrada'); while($r=$res->fetch_assoc()) echo $r['Field']."
"; ?>