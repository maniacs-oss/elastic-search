exports.Order = Order;

/* Class Order
 * adding, removing, searching 'order'
 * 
 */
function Order() {
    this.type = objectType.order;
};

/* Prototype river
 * add river for updating orders
 * 
 */
Order.prototype.river = function(callback) {
     // get orders
     var query_order = "SELECT order_id AS 'id',\n\
                              CONCAT('order',order_id) AS '_id',\n\
                              concept_id AS 'data.concept',\n\
                              orders.patient_id AS 'data.patient',\n\
                              given_name AS 'tags.name1',\n\
                              family_name AS 'tags.name2',\n\
                              middle_name AS 'tags.name3',\n\
                              instructions AS 'data.instructions',\n\
                              start_date AS 'data.startDate',\n\
                              orders.uuid AS 'tags.uuid',\n\
                              auto_expire_date AS 'data.autoExpireDate',\n\
                              orderer AS 'data.orderer',\n\
                              orders.encounter_id AS 'data.encounter',\n\
                              accession_number AS 'data.accessionNumber',\n\
                              discontinued_by AS 'data.discontinuedBy',\n\
                              discontinued_date AS 'data.discontinuedDate',\n\
                              discontinued_reason AS 'data.discontinuedReason',\n\
                              orders.uuid AS 'data.uuid',\n\
                              CONCAT('order ',description) AS 'data.display',\n\
                              name AS 'data.orderType.name',\n\
                              description AS 'data.orderType.description',\n\
                              'order' AS 'type' \n\
                         FROM encounter,\n\
                              order_type,\n\
                              orders,\n\
                              person_name \n\
                        WHERE encounter.encounter_id = orders.encounter_id \n\
                          AND orders.order_type_id = order_type.order_type_id \n\
                          AND orders.patient_id = person_name.person_id ";
    var river = new River();
    async.series([
        function(callback) {
            river.make(objectType.order,query_order,callback);
        }
    ],function(err,res) {
        callback();
    });
};

/* Prototype search
 * 
 * @param {type} data - value for searching
 * @param {type} options - request options
 * @param {type} user - user authorization data
 * @param {type} callback - function for returning data
 * @returns {undefined} 
 */
Order.prototype.search = function(data, options, user, callback) {
    var query = new Query(this.type);
    // if any options selected
    if ((data) || (options.q)) {
        var key = (data) ? data : options.q;
        if (key !== trimUUID(key)) {
            key = trimUUID(key);
            query.addOption('tags.uuid',key);
        }
        else {
            query.addFuzzyOption('tags.name1',key);
            query.addFuzzyOption('tags.name2',key);
            query.addFuzzyOption('tags.name3',key);
        }
    }
    // get orders by uuid
    getData(query.q, function(value) {
        // if there was no error, and we gat data
        if ((value.result === searchResult.ok) && (value.data.total > 0)) {
            // resulting object
            var result = [];
            async.each(value.data.hits,function(order,callback){
                var accept = false;
                // fetch fields
                async.parallel([
                    // check access rights to this object
                    function(callback) {
                        getDataByField(objectType.user_resource,'data.person',order._source.data.patient,function(items) {
                            // if there are groups with this person
                            if (items) {
                                // if it is single object - make an array with this obejct
                                if (!items.length) items = [items];
                                async.each(items,function(item,callback){
                                    // if resource group === user group
                                    if (user.group.indexOf(item.id) !== -1) accept = true;
                                    callback();
                                },function(res){
                                    callback();
                                });
                            }
                            else callback();
                        });
                    },
                    function(callback) {
                        // fetch concept
                        if ((!options.quick) && (order._source.data.concept)) {
                            getDataByField(objectType.concept,'id',order._source.data.concept,function(concept){
                                if ((concept) && (concept.length > 1)) order._source.data.concept = concept[0];
                                else order._source.data.concept = concept;
                                callback();
                            });
                        }
                        else callback();
                    },
                    function(callback) {
                        // fetch encounter
                        if ((!options.quick) && (order._source.data.encounter)) {
                            getDataByField(objectType.encounter,'id',order._source.data.encounter,function(enc){
                                if ((encounter) && (encounter.length > 1)) encounter = encounter[0];
                                order._source.data.encounter = enc;
                                callback();
                            });
                        }
                        else callback();
                    },
                    function(callback) {
                        // fetch patient
                        if ((!options.quick) && (order._source.data.patient)) {
                            getDataByField(objectType.patient,'id',order._source.data.patient,function(pat){
                                if ((pat) && (pat.length > 1)) pat = pat[0];
                                order._source.data.patient = pat;
                                callback();
                            });
                        }
                        else callback();
                    }
                ],function(err){
                    result.push(order._source.data);
                    callback();
                });
            },function(err,res){
                callback(result);
            });
        }
        else {
            if (value.result === searchResult.ok) callback([]);
            else 
            callback({
                'error' : {
                    message : errorType.server
                }
            });
        }
    });
};

/* Prototype remove
 * remove river for updating orders
 * 
 */
Order.prototype.remove = function(callback) {
    var river = new River();
    async.series([
        function(callback) {
            river.drop(objectType.order,callback);
        }
    ],function(err,res) {
        callback(err);
    });
};
