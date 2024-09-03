import { Router } from "express";
import { getBotConversationTopicChart } from "../controllers/getBotConversationTopicChart"
import { getBotConversationHistoryTable } from "../controllers/getBotConversationHistoryTable";
import { getBotExecutiveSummary } from "../controllers/getBotExecutiveSummary"
const router = Router();
/* {
    "data": {
      "row_length": Number(rowLength.value),
      "page": currentPage.value,
      "sort_column": 0,
      "direction": "desc",
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
} */

router.post('/get_bot_conversation_history_table', getBotConversationHistoryTable)
/* {
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "date_mode": Number(tempFilter.value.date)
  }
*/

router.post('/get_bot_executive_summary', getBotExecutiveSummary)
/* 
{
    "data": {
      "bot_id": queryID.value
    },
    "from_date": Number(dateOfCustom.value.fromDate),
    "to_date": Number(dateOfCustom.value.toDate),
    "search_filter": tempFilter.value.topic,
    "date_mode": Number(tempFilter.value.date)
}     
*/

router.post('/get_bot_conversation_topic_chart', getBotConversationTopicChart)

export default router;