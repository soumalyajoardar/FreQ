package com.gresseymusic.wave.ui.components

import android.widget.Toast
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.ui.components.DeletePlaylistDialog
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.launch














@Composable
fun DeletePlaylistDialog(
    playlistId: String,
    playlistTitle: String,
    onDismiss: () -> Unit,
    onDeleted: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val libraryRepository = LocalLibraryRepositoryProvider.current
    var isDeleting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Delete playlist?",
                style = Typography.titleLarge,
                color = FreqTheme.colors.textPrimary,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Text(
                text = "Are you sure you want to delete '$playlistTitle'? This will remove the playlist from your local library. Tracks will remain in your Liked Songs and listening history.",
                style = Typography.bodyMedium,
                color = FreqTheme.colors.textSecondary,
            )
        },
        confirmButton = {
            Button(
                onClick = {
                    if (isDeleting) return@Button
                    isDeleting = true
                    scope.launch {
                        val ok = libraryRepository.deletePlaylist(playlistId)
                        isDeleting = false
                        if (ok) {
                            Toast.makeText(context, "Playlist deleted", Toast.LENGTH_SHORT).show()
                            onDismiss()
                            onDeleted()
                        } else {
                            Toast.makeText(context, "Failed to delete playlist", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                enabled = !isDeleting,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFEF4444),
                    contentColor = FreqTheme.colors.iconPrimary,
                ),
            ) {
                Text("Delete", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = FreqTheme.colors.textSecondary)
            }
        },
        containerColor = FreqTheme.colors.surfaceElevated,
        shape = FreqShapes.cardLarge,
    )
}