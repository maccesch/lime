String.implement({parsePeerColumn:function(){if(!this.contains("::")){throw"Peer Column ("+this+") is not properly formatted, e.g., Peer::Column"}var e=this.split("::")[0];if(!window[e]){throw ("Peer Class ("+e+") is undefined")}var b=this.split("::")[1];var f=window[e];var g=f.getColumns()[b];if(g==null){throw ("Peer Class "+this+" not found")}var d=b.replace(/_/g,"-").camelCase().ucfirst();var a="get"+d;var h="set"+d;return{peer:f,peer_name:e,column:b,table_column:g,getter:a,setter:h,orig:this}},lcfirst:function(){return this.charAt(0).toLowerCase()+this.substr(1)},ucfirst:function(){return this.charAt(0).toUpperCase()+this.substr(1)}});if(!Impel){var Impel=new Class({Implements:[Options,Events],db:null,peers:[],options:{dbName:"impel"},initialize:function(a,b){},createDB:function(a){throw ("Impel.createDB is not yet supported.")},addPeer:function(a){throw ("Impel.addPeer is not yet supported.")},createTables:function(){throw ("Impel.createTables is not yet supported.")},importData:function(){throw ("Impel.importData is not yet supported. See Impel.inTouch ")}})}Impel.ResultSet=new Class({results:Array(),initialize:function(a){for(var b=0;b<a.rows.length;b++){this.results.push(a.rows.item(b))}},toArray:function(){return this.results}});Impel.CritConstants={JOIN:" JOIN ",LEFT_JOIN:" LEFT JOIN ",LEFTJOIN:" LEFT JOIN ",IS_NULL:" IS NULL",ISNULL:" IS NULL",IS_NOT_NULL:" IS NOT NULL",ISNOTNULL:" IS NOT NULL",EQUAL:"=",NOT_EQUAL:"<>",NOTEQUAL:"<>",IN:" IN",NOT_IN:" NOT IN",NOTIN:" NOT IN",NOT_LIKE:" NOT LIKE",NOTLIKE:" NOT LIKE",LIKE:" LIKE",OR:" OR ",AND:" AND ",ON:" ON ",LIMIT:" LIMIT ",ASC:" ASC",DESC:" DESC",GREATER_THAN:">",GREATERTHAN:">",GREATER_EQUAL:">=",GREATEREQUAL:">=",LESS_THAN:"<",LESSTHAN:"<",LESS_EQUAL:"<=",LESSEQUAL:"<="};Impel.Criterion=new Class({values:[],clauses:"",columns:[],p:null,length:1,peer_tables:[],initialize:function(d,a,f,e){this.p=d;this.values.push(f);e=e||Impel.CritConstants.EQUAL;a=a.parsePeerColumn();if(e==Impel.CritConstants.IN&&$type(f)=="array"){this.clauses=a.table_column+e+"(";for(var b=0;b<f.length;b++){this.clauses+="?,"}this.clauses+="?)"}else{this.clauses=a.table_column+e+"?"}if(this.peer_tables.contains(a.peer.getTableName())==false){this.peer_tables.push(a.peer.getTableName())}if(this.columns.contains(a.column)==false){this.columns.push(a.column)}},addAnd:function(a){if(!a instanceof Impel.Criterion){throw ("Impel.Criterion.addAnd(criterion) expects a Impel.Criterion object")}this.values.push(a.values);this.clauses+=Impel.CritConstants.AND+a.getClause();this.length++},addOr:function(a){if(!a instanceof Impel.Criterion){throw ("Impel.Criterion.addOr(criterion) expects a Impel.Criterion object")}this.values.push(a.values);this.clauses+=Impel.CritConstants.OR+a.getClause();this.length++},getClause:function(){if(this.length>1){return"("+this.clauses+")"}return this.clauses},getValues:function(){return this.values},getTables:function(){return this.peer_tables},getColumns:function(){return this.columns},getDbug:function(){return this.getClause()+"["+this.getValues()+"]"}});Impel.Criteria=new Class({Implements:[Options,Events],options:{},clause:"",values:[],select_columns:[],insert_columns:[],peer_tables:[],where_clauses:{" AND ":[]," OR ":[]},left_joins:$H({}),length:0,initialize:function(a,b){this.setOptions(a);this.addEvents(b)},getNewCriterion:function(a,d,b){return new Impel.Criterion(this,a,d,b)},addCriterion:function(a,b){if(!a instanceof Impel.Criterion){throw ("Impel.Criteria.addCriterion() expects a Impel.Criterion object")}b=b||Impel.CritConstants.AND;a.getTables().each(function(d){this.peer_tables.include(d)},this);critValues=a.getValues();a.getColumns().each(function(e,d){if(e.contains(".")){e=e.split(".")[1]}if(this.insert_columns.contains(e)==false){this.insert_columns.push(e)}else{console.log("Impel.Criteria: Attempt to add a duplicate column ("+e+"='"+critValues[d]+"'); ignoring");critValues.splice(d,1)}},this);this.values.push(critValues);this.where_clauses[b].push(a.getClause());this.length++},add:function(d,b,a){if(d instanceof Impel.Criterion){return this.addCriterion(d)}return this.addCriterion(this.getNewCriterion(d,b,a))},addOr:function(a,d,b){if(a instanceof Impel.Criterion){return this.addCriterion(a)}return this.addCriterion(this.getNewCriterion(a,d,b),Impel.CritConstants.OR)},addAnd:function(a,d,b){if(a instanceof Impel.Criterion){return this.addCriterion(a)}return this.addCriterion(this.getNewCriterion(a,d,b))},addSelectColumn:function(a){a=a.parsePeerColumn();this.select_columns.push(a.table_column+" AS '"+a.table_column+"'")},getSelectColumns:function(){return this.select_columns},hasSelectColumns:function(){if(this.select_columns.length>0){return true}return false},leftJoinsHas:function(a){if($type(a)=="string"){a=a.parsePeerColumn()}else{if($type(a)!="object"||!!a.peer==false){throw ("Impel.Criteria.leftJoinsHas() expects a Peer::column String, or parsed Peer::column argument")}}if(this.left_joins.getKeys().contains(a.peer.getTableName())){return true}var b,f,e;b=false;f=a.peer.getTableName();e=this.left_joins.getKeys();for(var d=0;d<e.length;d++){if(this.left_joins[e[d]]["left"]==f){b=true;break}}return b},addJoin:function(d,b,a){d=d.parsePeerColumn();b=b.parsePeerColumn();a=(a==Impel.CritConstants.LEFT_JOIN)?a:Impel.CritConstants.JOIN;if(a==Impel.CritConstants.JOIN){if(!this.leftJoinsHas(d)){this.peer_tables.include(d.peer.getTableName())}if(!this.leftJoinsHas(b)){this.peer_tables.include(b.peer.getTableName())}this.where_clauses[Impel.CritConstants.AND].push(d.table_column+Impel.CritConstants.EQUAL+b.table_column)}else{if(a==Impel.CritConstants.LEFT_JOIN){if(!!this.left_joins[b.peer.getTableName()]){throw ("Cannot use the same table as the right side of two LEFT JOIN statements: "+b.peer.getTableName())}this.left_joins[b.peer.getTableName()]={left:d.peer.getTableName(),ON:Impel.CritConstants.ON+d.table_column+Impel.CritConstants.EQUAL+b.table_column};this.peer_tables.erase(b.peer.getTableName());this.peer_tables.erase(d.peer.getTableName())}}},leftJoinDbug:function(){this.left_joins.getKeys().each(function(a){console.log(a+": ");console.log(this.left_joins.get(a))},this)},getLeftJoinClauses:function(){this.left_joins.each(function(d,b){if(this.has(d.left)){this[d.left][Impel.CritConstants.ON]+=Impel.CritConstants.LEFT_JOIN+b+d.ON;this.erase(b)}}.bind(this.left_joins));var a=[];this.left_joins.each(function(d,b){a.push(d.left+Impel.CritConstants.LEFT_JOIN+b+d.ON)});return a.join(", ")},getSelectSQL:function(){var a="SELECT "+this.getSelectModifiers()+" "+this.select_columns.join(", ")+" FROM ";if(this.left_joins.getLength()>0){a+=this.getLeftJoinClauses();a+=Impel.utils.isEmpty(this.getTableNames())?" ":", "}if(!Impel.utils.isEmpty(this.getTableNames())){a+=this.getTableNames()+" "}a+=this.getWhereClause();if(!Impel.utils.isEmpty(this.options.groupby)){a+=this.options.groupby+" "}if(!Impel.utils.isEmpty(this.options.orderby)){a+=this.options.orderby+" "}if(this.options.limit!=null){a+=Impel.CritConstants.LIMIT+this.options.limit}return a+";"},getWhereClause:function(){var a="";if(!Impel.utils.isEmpty(this.where_clauses[Impel.CritConstants.AND])||!Impel.utils.isEmpty(this.where_clauses[Impel.CritConstants.OR])){a+="WHERE "}if(!Impel.utils.isEmpty(this.where_clauses[Impel.CritConstants.AND])){a+=this.where_clauses[Impel.CritConstants.AND].join(Impel.CritConstants.AND)+" "}if(!Impel.utils.isEmpty(this.where_clauses[Impel.CritConstants.OR])){if(!Impel.utils.isEmpty(this.where_clauses[Impel.CritConstants.AND])){a+=Impel.CritConstants.AND}a+=this.where_clauses[Impel.CritConstants.OR].join(Impel.CritConstants.OR)+" "}return a},getInsertSQL:function(){var b="INSERT INTO "+this.getTableNames()+"("+this.insert_columns.join(", ")+") VALUES(";for(var a=1;a<this.insert_columns.length;a++){b+="?,"}b+="?);";return b},getUpdateSQL:function(a){if($type(this.insert_columns)!="array"&&this.insert_columns.length<=0){throw"You must call Impel.Criteria::add() for each column that is to be updated before Impel.Criteria::getUpdateSQL(constrainCrit)"}if(!(a instanceof Impel.Criteria)){throw"Impel.Criteria::getUpdateSQL(constrainCrit) expects another Impel.Criteria object as an argument"}stmt="UPDATE "+this.getTableNames()+" SET "+this.insert_columns[0]+"=?";for(var b=1;b<this.insert_columns.length;b++){stmt+=","+this.insert_columns[b]+"=?"}stmt+=" "+a.getWhereClause();if(this.options.limit!=null){stmt+=Impel.CritConstants.LIMIT+this.options.limit}else{if(a.options.limit!=null){stmt+=Impel.CritConstants.LIMIT+a.options.limit}}stmt+=";";this.values.push(a.getValues());return stmt},getDeleteSQL:function(){return stmt="DELETE FROM "+this.getTableNames()+" "+this.getWhereClause()+";"},getValues:function(){return this.values.flatten()},addTable:function(a){this.peer_tables.include(a)},getTableNames:function(){return this.peer_tables.join(", ")},getSelectModifiers:function(){if(this.options.distinct==true){return" DISTINCT "}return""},setLimit:function(a){this.options.limit=a},setDistinct:function(){this.options.distinct=true},addAscendingOrderByColumn:function(a){if(a.contains("::")){this.options.orderby="ORDER BY "+a.parsePeerColumn()["table_column"]+Impel.CritConstants.ASC}else{this.options.orderby="ORDER BY "+a+Impel.CritConstants.ASC}},addDescendingOrderByColumn:function(a){if(a.contains("::")){this.options.orderby="ORDER BY "+a.parsePeerColumn()["table_column"]+Impel.CritConstants.DESC}else{this.options.orderby="ORDER BY "+a+Impel.CritConstants.DESC}},addGroupByColumn:function(a){this.options.groupby="GROUP BY "+a.parsePeerColumn()["table_column"]},addAsColumn:function(a,b){}});var ImpelPeer=new Class({Implements:[Options,Events],options:{columns:{},table:"",base_object:""},columns:{},deleting_ids:[],has_manys:$H({}),has_many_throughs:$H({}),initialize:function(a,b){this.setOptions(a);this.addEvents(b);this.options.columns=$H(this.options.columns);this.generateAttributes();this.generateMethods()},getBaseObjName:function(){return this.options.base_object},generateAttributes:function(){var a={};a.attributes={};this.options.columns.each(function(d,b){a.attributes[b]=""});window[this.options.base_object].implement(a)},generateMethods:function(){var a={};this.options.columns.each(function(e,d){var b=("get-"+d.replace(/_/g,"-")).camelCase();a[b]=function(){return this.attributes[d]};var f=("set-"+d.replace(/_/g,"-")).camelCase();a[f]=function(g){this.attributes[d]=g;this.modified_columns.push(d)}});window[this.options.base_object].implement(a)},addSelectColumns:function(a){a=($type(a)!="object")?new Impel.Criteria():a;$H(this.options.columns).getKeys().each(function(b){a.addSelectColumn(this.options.base_object+"Peer::"+b)}.bind(this));return a},addTable:function(a){a=($type(a)!="object")?new Impel.Criteria():a;a.addTable(this.getTableName());return a},getColumns:function(a){return this.options.columns},getTableName:function(){return this.options.table},getSelectColumns:function(){var a=[];this.options.columns.getValues().each(function(b){a.push(b+" AS '"+b+"'")});return a.join(", ")},executeSQL:function(f,b,e,d,g,h,a){a=a||Impel.db;if(a==null){throw"No suitable database connection found. Assign one to Impel.db"}if($type(f)!="string"){throw"executeSQL(sql,values,success_callback,failure_callback) requires an at least an SQL statment"}b=b||[];if($type(b)!="array"){throw"ImpelPeer::executeSQL - second parameter (values) must be an array."}if($type(e)!="function"){e=$empty}if($type(d)!="function"){d=$empty}a.transaction(function(j){dbug.time(f+" ["+b+"]");j.executeSql(f,b,function(l,k){dbug.timeEnd(f+" ["+b+"]");if($type(g)=="object"){if(h!=null){g[h](k)}else{g.callback(k)}}e(k)}.bind(this),function(k,l){dbug.timeEnd(f+" ["+b+"]");d(l)})}.bind(this),function(j,k){dbug.timeEnd(f+" ["+b+"]");d(k)})},doSelect:function(d,b,a){a=a||Impel.db;if(a==null){throw"No suitable database connection found. Assign one to Impel.db"}if(d==null){throw"doSelect(criteria) requires a Impel.Criteria object"}a.transaction(function(f){if(!d.hasSelectColumns()){d=this.addSelectColumns(d)}this.addTable(d);var e=d.getSelectSQL();dbug.time(e+" ["+d.getValues().join(",")+"]");f.executeSql(e,d.getValues(),function(h,g){dbug.timeEnd(e+" ["+d.getValues().join(",")+"]");var j=Array();new Impel.ResultSet(g).toArray().each(function(l){var k=new window[this.options.base_object]();k.hydrate(l);j.push(k)}.bind(this));b(j)}.bind(this),function(){})}.bind(this))},doSelectOne:function(d,b,a){a=a||Impel.db;if(a==null){throw"No suitable database connection found. Assign one to Impel.db"}if(d==null){throw"doSelect(criteria) requires a Impel.Criteria object"}a.transaction(function(f){if(!d.hasSelectColumns()){d=this.addSelectColumns(d)}this.addTable(d);d.setLimit(1);var e=d.getSelectSQL();dbug.time(e+" ["+d.getValues().join(",")+"]");f.executeSql(e,d.getValues(),function(h,g){dbug.timeEnd(e+" ["+d.getValues().join(",")+"]");var j=new window[this.options.base_object]();j.hydrate(new Impel.ResultSet(g).toArray()[0]);b(j)}.bind(this),function(){})}.bind(this))},doSelectOneJoinAll:function(e,d,a,b){this.doSelectJoinAll(e,function(f){d(f.getValues()[0]);f=null},a,b)},retrieveByPkId:function(d,b,a){if(d==null){throw ("ImpelPeer::retireveByPkIdJoinAll requires an id argument")}c=new Impel.Criteria();c.add(this.getBaseObjName()+"Peer::id",d);this.doSelectOne(c,b,a)},retrieveByPkIdJoinAll:function(e,d,a,b){if(e==null){throw ("ImpelPeer::retireveByPkIdJoinAll requires an id argument")}c=new Impel.Criteria();c.add(this.getBaseObjName()+"Peer::id",e);this.doSelectJoinAll(c,function(f){d(f.getValues()[0]);f=null},a,b)},doSelectJoinAll:function(f,e,a,b){if($type(b)!="array"){b=[]}var d=this.addTable(this.addSelectColumns(f));this.has_manys.each(function(g){if(b.contains(g.peer.getBaseObjName())){return}d=g.peer.addTable(g.peer.addSelectColumns(d));d.addJoin(this.getBaseObjName()+"Peer::id",g.peer_name+"::"+g.column)},this);this.has_many_throughs.each(function(g){if(b.contains(g[0].peer.getBaseObjName())){return}d=g[0].peer.addTable(g[0].peer.addSelectColumns(d));d=g[1].peer.addTable(d);d.addJoin(this.options.base_object+"Peer::id",g[1].peer_name+"::"+g[1].column);d.addJoin(g[0].peer_name+"::"+g[0].column,g[2].peer_name+"::"+g[2].column)},this);this.executeSQL(d.getSelectSQL(),d.getValues(),function(g){var h=$H({});new Impel.ResultSet(g).toArray().each(function(m){var l=new window[this.getBaseObjName()]();var j=[];var k=null;l.hydrate(m);var n=l.getId();h.include(n,l);l=null;l=h.get(n);this.has_manys.each(function(o){if(b.contains(o.peer.getBaseObjName())){return}k=new window[o.peer.getBaseObjName()]();k.hydrate(m);l["add"+o.peer.getBaseObjName()](k)},this);this.has_many_throughs.each(function(o){if(b.contains(o[0].peer.getBaseObjName())){return}k=new window[o[0].peer.getBaseObjName()]();k.hydrate(m);l["add"+o[0].peer.getBaseObjName()](k)},this)},this);e(h)}.bind(this),function(g){throw ("Query failed: "+g)})},doSelectJoinAllExcept:function(e,d,a,b){if($type(a)!="array"){throw ("doSelectJoinAllExcept requires an array of peer names as an argument")}return this.doSelectJoinAll(e,d,b,a)},hasMany:function(b){this.has_manys.set([b],b.parsePeerColumn());b=this.has_manys[b];var d="add"+b.peer.options.base_object;var a="get"+b.peer.options.base_object+"s";var e=b.peer.options.base_object.toLowerCase();var f={};f[a]=function(){return this.attributes[e]};f[d]=function(h){if(this.attributes[e]==null){this.attributes[e]=[]}if(this.attributes[e][h.getId()]==null){this.attributes[e].push(h)}};window[this.options.base_object].implement(f);var g="doSelectJoin"+b.peer.options.base_object;this[g]=function(l,k,h){var j=this.addTable(this.addSelectColumns(l));j=b.peer.addTable(b.peer.addSelectColumns(j));j.addJoin(this.options.base_object+"Peer::id",b.peer_name+"::"+b.column);this.executeSQL(j.getSelectSQL(),j.getValues(),function(m){var n=$H({});new Impel.ResultSet(m).toArray().each(function(q){var p=new window[this.options.base_object]();var o=new window[b.peer.options.base_object]();p.hydrate(q);var r=p.getId();n.include(r,p);p=null;p=n.get(r);o.hydrate(q);p[d](o)},this);k(n)}.bind(this),function(m){throw ("Query failed: "+m)})}},hasManyThrough:function(e,d,k){var h=e+","+d+","+k;this.has_many_throughs.set(h,[e.parsePeerColumn(),d.parsePeerColumn(),k.parsePeerColumn()]);e=this.has_many_throughs[h][0];d=this.has_many_throughs[h][1];k=this.has_many_throughs[h][2];var b="add"+e.peer.options.base_object;var f="get"+e.peer.options.base_object+"s";var g=e.peer.options.base_object.toLowerCase();var j={};j[f]=function(){return this.attributes[g]};j[b]=function(l){if(this.attributes[g]==null){this.attributes[g]=[]}if(this.attributes[g][l.getId()]==null){this.attributes[g].push(l)}};window[this.options.base_object].implement(j);var a="doSelectJoin"+e.peer.options.base_object+"Through"+d.peer.options.base_object;this[a]=function(o,n,l){var m=this.addTable(this.addSelectColumns(o));m=e.peer.addTable(e.peer.addSelectColumns(m));m=d.peer.addTable(m);m.addJoin(this.options.base_object+"Peer::id",d.peer_name+"::"+d.column,Impel.CritConstants.LEFT_JOIN);m.addJoin(e.peer_name+"::"+e.column,k.peer_name+"::"+k.column);this.executeSQL(m.getSelectSQL(),m.getValues(),function(p){var q=$H({});new Impel.ResultSet(p).toArray().each(function(t){var s=new window[this.options.base_object]();var r=new window[e.peer.options.base_object]();s.hydrate(t);var u=s.getId();q.include(u,s);s=null;s=q.get(u);r.hydrate(t);s[b](r)},this);n(q)}.bind(this),function(p){throw ("Query failed: "+p)})}},isDeleting:function(a){if($type(a)!="number"||a==0){return false}return this.deleting_ids.contains(a)},setDeleted:function(a){if($type(a)!="number"||a==0){return false}return this.deleting_ids.erase(a)},setDeleting:function(a){if($type(a)!="number"||a==0){return false}return this.deleting_ids.push(a)},generateDocs:function(){var d,b,a,f;b=[];jsdoc="";for(mem in this){if(!this.hasOwnProperty(mem)){continue}d=mem.substring(0,"doSelectJoin".length);if(mem!=="doSelectJoinAll"&&mem!=="doSelectJoinAllExcept"&&mem.contains("doSelectJoin")){b.push(mem)}}b.each(function(e){if(e.contains("Through")){a=e.substring("doSelectJoin".length,e.indexOf("Through"));f=e.substring(e.indexOf("Through")+"Through".length,e.length);jsdoc+="\n\n/**\n * Retrieve objects from the database including their associated "+a+" m-m objects using "+f+" as an intermediary. \n * @param {Impel.Criteria} criteria The Impel.Criteria object to use to construct and limit the query. \n * @param {function} callback(Objects[]) The function to pass the results to \n * @param {Database} [con] The database connection to use.\n * @returns {undefined} The callback function will be used to pass the results back\n */\n"+e+" : "+this[e]}else{a=e.substring("doSelectJoin".length,e.length);jsdoc+="\n\n/**\n * Retrieve objects from the database including their associated "+a+" 1-m objects.\n * @param {Impel.Criteria} criteria The Impel.Criteria object to use to construct and limit the query. \n * @param {function} callback(Objects[]) The function to pass the results to \n * @param {Database} [con] The database connection to use.\n * @returns {undefined} The callback function will be used to pass the results back\n */\n"+e+" : "+this[e]}},this);return jsdoc}});var ImpelClass=new Class({Implements:[Options,Events],options:{},attributes:{},is_new:true,modified_columns:[],is_deleted:false,is_deleting:false,is_saving:false,initialize:function(a,b){this.setOptions(a);this.addEvents(b)},getPeer:function(){return window[this.peer_class]},updateIdFromRS:function(a){if(this.isNew()){try{this.attributes.id=a.insertId;this.is_new=false}catch(b){console.log("Failed to save the new object into the database. Did you manually call isNew(false)? Don't do that")}}this.is_saving=false;if(a.rowsAffected<=0){if(this.is_deleted){throw"Can't update or insert and object that has been deleted"}throw"INSERT or UPDATE seems to have failed."}},saveOnlyMe:function(e,d){if(this.is_deleted||window[this.peer_class].isDeleting(this.getId())){throw ("Can't save an object that has been, or is being deleted: "+this.getId())}this.is_saving=true;var a=new Impel.Criteria();this.modified_columns.each(function(f){a.add(this.peer_class+"::"+f,this.attributes[f])},this);var b="";if(this.isNew()){if(this.attributes.created_at!=null){this.setCreatedAt(Date())}b=a.getInsertSQL()}else{if(Impel.utils.isEmpty(this.attributes.id)){throw"Objects must have a defined id attribute before they can be updated."}if(this.attributes.updated_at!=null){this.setUpdatedAt(Date())}constraintCrit=new Impel.Criteria();constraintCrit.add(this.peer_class+"::id",this.attributes.id);b=a.getUpdateSQL(constraintCrit)}this.getPeer().executeSQL(b,a.getValues(),e,d,this,"updateIdFromRS")},saveOneToManyObjs:function(d,b){if(this.isNew()){throw ("saveOneToManyObjs cannot be called until this object has been saved")}var a=[];this.getPeer().has_manys.each(function(e){var f=this["get"+e.peer.getBaseObjName()+"s"]();if(f==null){return}f.each(function(h,g){if(h[e.getter]()!=this.getId()){h[e.setter](this.getId())}if(h.isModified()){a.push(h)}},this)},this);a.each(function(e){e.save($empty,function(f){throw"Failed to save dependent object. Database error:"+f.message})})},saveMtoMObjsandLink:function(f,e,a){if(this.isNew()){throw ("saveMtoMObjsandLink cannot be called until this object has been saved")}var g=0;var b=1;this.getPeer().has_many_throughs.each(function(h,j){var k=this["get"+h[0].peer.getBaseObjName()+"s"]();if(k==null){return}k.each(function(n,m){var l=new window[h[1].peer.getBaseObjName()]();l[h[1].setter](this.getId());if(n.isNew()){g++;n.save(function(p){try{l[h[2].setter](p.insertId);l.save(function(){g--},function(r){throw ("database error: "+r.message)})}catch(q){throw"Saved m-m dependent object, but failed to save connection between them:"+q}}.bind(this),function(p){throw"Failed to save m-m dependent object, will not save connection object:"+p.message})}else{if(a){saveing++;l[h[2].setter](n.getId());l.save(function(){save--},function(p){throw ("Database error: "+p.message)})}else{var o=new Impel.Criteria();o.add(h[1].orig,this.getId());o.add(h[2].orig,n[h[2].getter]);h[2].peer.doSelectOne(o,function(q){if($type(q)!="object"){var p=new window[h[1].peer.getBaseObjName()]()}p[h[1].setter](this.getId());p[h[2].setter](n.getId());g++;p.save(function(){save--},function(r){throw ("Database error: "+r.message)})}.bind(this))}if(n.isModified()){n.save()}}},this)},this);var d=function(){if(b>1&&g==0){f()}else{if(b>100){e("Failed to save all m-m related objects")}else{this.delay(10,this);b++}}};d.delay(50,d)},isModified:function(){return(this.modified_columns.length>0)?true:false},save:function(b,a){if($type(b)!="function"){b=$empty}if($type(a)!="function"){a=$empty}if(this.isNew()){this.saveOnlyMe(function(d){try{this.saveOneToManyObjs();this.saveMtoMObjsandLink(function(){b(d)},$empty,true)}catch(f){throw ("Failed to save dependent objects: "+f.message)}}.bind(this),function(d){console.log("Failed to save base object: "+d);a(arguments)})}else{if(this.isModified()){this.saveOnlyMe(b,a)}this.saveOneToManyObjs();this.saveMtoMObjsandLink($empty,$empty,false)}},removed:function(){this.is_deleted=true;this.getPeer().setDeleted(this.getId())},remove:function(d,b){if(this.is_saving){throw ("Can't remove object because it is currently being saved. ")}if(this.isNew()){throw ("Object does not exist in the database")}this.getPeer().setDeleting(this.getId());var a=new Impel.Criteria();a.add(this.peer_class+"::id",this.getId());this.getPeer().executeSQL(a.getDeleteSQL(),a.getValues(),d,b,this,"removed")},hydrate:function(a){var b={};$H(a).getKeys().each(function(d){if(d.contains(".")){attr=d.split(".")[1];klass=d.split(".")[0];if(klass==window[this.peer_class].getTableName()){b[attr]=a[d]}}else{b[d]=a[d]}},this);if(b.id&&window[this.peer_class].isDeleting(b.id)){throw"Can't hydrate object because it is currently being deleted from the database."}this.setAttributes(b);this.is_new=false},setAttributes:function(a){this.attributes=$merge.run([this.attributes].extend(arguments))},setOptions:function(a){this.parent(a)},getDbug:function(){dbg="";$H(this.attributes).getKeys().each(function(a){dbg+=a+" : "+this.attributes[a]+"\n"}.bind(this));dbg+="isNew: "+this.isNew()+"\n";return dbg},dbug:function(){console.log(this.getDbug())},isNew:function(a){if($type(a)=="boolean"){this.is_new=a}return this.is_new},generateDocs:function(){var h,b,g,f,a,d,e;f=[];g=[];a=[];mmgetters=[];b="";for(mem in this){h=mem.substring(0,3);if((h==="get"||h==="set"||h==="add")&&(mem!=="setOptions"&&mem!=="setAttributes"&&mem!=="getDbug"&&mem!=="addEvents"&&mem!=="addEvent"&&mem!=="getPeer")){if(mem.charAt(mem.length-1)=="s"){mmgetters.push(mem)}else{if(h=="set"){g.push(mem)}else{if(h=="get"){f.push(mem)}else{if(h=="add"){a.push(mem)}}}}}}g.each(function(j){e=j.substring(3,j.length).toLowerCase();b+="\n\n/**\n * @param {mixed} v The value to set the corresponding internal "+e+" attribute\n * @returns {undefined}\n */\n"+j+" : "+this[j]},this);f.each(function(j){e=j.substring(3,j.length).toLowerCase();b+="\n\n/**\n * Retrieve the corresponding internal "+e+" attribute\n * @returns {mixed} The corresponding internal attribute\n */\n"+j+" : "+this[j]},this);a.each(function(j){e=j.substring(3,j.length);b+="\n\n/**\n * Add an associated 1-m or m-m "+e+" object to object \n * @returns {undefined} \n */\n"+j+" : "+this[j]},this);mmgetters.each(function(j){e=j.substring(3,j.length-1);b+="\n\n/**\n * Retrieve the associated 1-m or m-m "+e+" objects from this object's internal storage. <strong>Not the database</strong> \n * @returns {"+e+"[]} An array of the associated objects \n */\n"+j+" : "+this[j]},this);return b}});Impel.utils={};Impel.utils.isEmpty=function(a){if(null==a||""==a){return true}return false};Impel.inTouch=new Class({Implements:[Options,Events],options:{name:"Impel_inTouch",displayName:"Impel inTouch",maxSize:4096,baseURL:null,versionsFile:"versions.json.php",tableFileSuffix:".json.php"},version:0.7,versions:$H({}),loaded:false,initialize:function(a,b){this.setOptions(a);this.addEvents(b);this.loadVersions(function(){this.loaded=true;this.ready()}.bind(this))},ready:function(){this.fireEvent("ready")},synced:function(){this.fireEvent("synced")},syncFailed:function(a){this.fireEvent("syncFailed",a)},syncing:function(){this.fireEvent("syncing")},updating:function(a){this.fireEvent("updating",a)},updated:function(d,a,b){this.fireEvent("updated",[d,a,b])},updateFailed:function(d,b,a){this.fireEvent("updateFailed",[d,b,a])},created:function(a){this.fireEvent("created",a)},aborted:function(a){this.fireEvent("abort",a)},createFailed:function(b,a){this.fireEvent("createFailed",[b,a])},loadVersions:function(f){try{if(!window.openDatabase){throw ("HTML 5 SQL database not supported")}else{this.db=openDatabase(this.options.name,"1.0",this.options.displayName,this.options.maxSize)}}catch(g){if(g==2){throw ("Encountered an error while opening the database: invalid database version")}else{throw ("Encountered an error while opening the database: unknown error "+g+".")}}var d,a,j,h,b;d=this;a=function(k,e){for(b=0;b<e.rows.length;b++){h=e.rows.item(b);d.versions.set(h.t,h.v)}f()};j=function(k,e){k.executeSql("SELECT * FROM table_versions;",[],a,function(l){throw ("Unable to retrieve list of current table versions: "+l.message)})};this.db.transaction(function(e){e.executeSql("CREATE TABLE IF NOT EXISTS table_versions('t' TEXT NOT NULL PRIMARY KEY, 'v' INT NOT NULL);",[],j,function(k,l){throw ("Unable to create table to cache version data: "+l.message)})}.bind(this),function(k,l){throw ("Unable to create table to cache version data: "+l.message)})},getVersion:function(a){return this.versions.get(a)},setVersion:function(b,a){this.versions.set(b,a);this.db.transaction(function(d){d.executeSql("INSERT INTO table_versions ('t', 'v') VALUES (?,?);",[b,a],null,function(f,e){f.executeSql("UPDATE table_versions SET v=? WHERE t=?",[a,b],null,function(g){throw ("Unable to save record: "+b+" = "+a+"\n"+g.message)})})})},checkForUpdates:function(a){if(this.options.baseURL==null){throw"baseURL attribute must be set when instantiating an Impel.inTouch object"}if(a==null){try{new Impel.JsonP(this.options.baseURL+this.options.versionsFile,{callback:function(e){this.checkForUpdates(e)}.bind(this),onFailure:function(){this.aborted(1)}.bind(this)}).request()}catch(g){throw"Impel.inTouch requires the Impel.JsonP Class."}}else{var h,f,d,b;h=null;f=[];d=null;a.each(function(e){if(e.table!=null){h=this.getVersion(e.table);if(e.version!=null){if(h==null||h<e.version){f.push(e.table)}}else{if(e.versions!=null){if(h==null||h<e.versions[e.versions.length-1]){d=[];for(b=e.versions.indexOf(h)+1;b<e.versions.length;b++){d.push(e.versions[b])}f.push({table:e.table,versions:d});d=null}}}h=null}}.bind(this));this.sync(f)}},sync:function(g){if(!this.loaded){throw"Implen.inTouch.sync() cannot be called before Impel.inTouch is finished initializing. Wait for the 'ready' event."}if(g==null){this.checkForUpdates()}else{if(g.length==0){this.synced();return}var a=[];var h=[];$each(g,function(j){if(typeof j=="string"){h.push(j)}else{j.versions&&j.table&&$each(j.versions,function(m,l){h.push(j.table)})}});this.addEvent("updateFailed",function(j){h.splice(h.indexOf(j),1);a.push(j);if(h.length==0){this.syncFailed(a)}});this.addEvent("updated",function(j){h.splice(h.indexOf(j),1);if(h.length==0){if(a.length>0){this.syncFailed(a)}else{this.synced()}}e(j)});var d,f,e,b;f=this;d=[];this.addEvent("updating",function(j){b=j});e=function(j){if(j&&j!=b){return}var k=d.shift();if(!!k==false){return}f.updating(k.table);var l=f.options.baseURL+k.table;if(k.version){l+="_"+k.version}l+=f.options.tableFileSuffix;new Impel.JsonP(l,{callback:function(m){f.importData(m)}}).request()};g.each(function(j){if(typeof j=="string"){d.push({table:j})}else{if(typeof j=="object"&&$type(j.versions)=="array"){for(i=0;i<j.versions.length;i++){d.push({table:j.table,version:j.versions[i]})}}}}.bind(this));e()}},importData:function(d){if(d.table==null||d.version==null){return}var e=this.getVersion(d.table);e=e||0;if(e!=null&&e>=d.version){this.updated(d.table,e,d.version);return}var a=function(f){return"SQL Error: "+f.message+"("+f.code+")"};var b="";if(d.create!=null||d.data!=null){this.db.transaction(function(g){if(d["pre-create"]!=null&&d["pre-create"].$family.name=="array"){d["pre-create"].each(function(h){g.executeSql(h,[],function(){},function(j,k){throw ("Statement failed: "+h+"\n"+a(k));return true})})}if(d.create!=null){g.executeSql(d.create,[],function(){this.created(d.table)}.bind(this),function(h,j){this.createFailed(d.table,a(j));throw ("Statement failed: "+d.create+"\n"+a(j));return true}.bind(this))}if(d.extra!=null&&d.extra.$family.name=="array"){d.extra.each(function(h){g.executeSql(h,[],null,function(j,k){throw ("Statement failed: "+h+"\n"+a(k));return true})})}if(d.data!=null&&d.data.$family.name=="array"){for(var f=0;f<d.data.length;f++){b=d.data[f];if(typeof(b)=="string"){g.executeSql(b,[],null,function(h,j){throw ("Failed to load data: "+b+"\n"+a(j));return true})}}}}.bind(this),function(){this.updateFailed(d.table,e,d.version)}.bind(this),function(){this.setVersion(d.table,d.version);this.updated(d.table,e,d.version)}.bind(this))}}});Impel.JsonP=new Class({Implements:[Options,Events],options:{callBackKey:"callback",queryString:"",data:{},timeout:5000,callback:function(){throw ("Error: Impel.JsonP objects must have a callback function defined as part of their instantiation options.")}},script:null,initialize:function(b,a){this.setOptions(a);this.url=this.makeUrl(b)},isComplete:function(){try{this.script.dispose()}catch(a){}},request:function(d){var a=Math.floor(Math.random()*101);d=this.makeUrl(d);my=this;Impel.JsonP.callback=function(e){(function(){my.options.callback(e)}).delay(50);my.isComplete()};var b=(Browser.Engine.trident)?50:0;(function(){this.script=new Element("script",{src:d,type:"text/javascript",id:"jsonp_"+a});this.script.inject(document.head);(function(){if(this.script.getParent()){this.fireEvent("onFailure");this.script.dispose()}}).delay(this.options.timeout,this)}.bind(this)).delay(b);return this},makeUrl:function(a){var b;if(a){var d=(a.test("\\?"))?"&":"?";b=a+d+this.options.callBackKey+"=Impel.JsonP.callback";if(this.options.queryString){b+="&"+this.options.queryString}b+="&"+Hash.toQueryString(this.options.data)}else{b=this.url}return b}});var Criteria=new Class({Extends:Impel.Criteria});var ResultSet=new Class({Extends:Impel.ResultSet});var CritConstants=Impel.CritConstants;